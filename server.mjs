import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes, scryptSync, timingSafeEqual, createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const cities = {Dubai:'AED', Bengaluru:'INR', Mumbai:'INR', Pune:'INR', Hyderabad:'INR'};
const habits = {
  sleep:['Early','Late','Flexible'],
  cleaning:['Daily','Weekly','Flexible'],
  smoking:['Smoke-free','Outdoor only'],
  pets:['Pet-friendly','No pets']
};
const fail = (status,message) => { throw Object.assign(new Error(message),{status}); };
const str = (value,max,min=1) => {
  if(typeof value !== 'string' || value.trim().length < min || value.length > max) fail(400,'Check the required fields and their lengths.');
  return value.trim();
};
const money = value => {
  if(!Number.isSafeInteger(value) || value < 1 || value > 10000000) fail(400,'Enter a valid whole-number monthly amount.');
  return value;
};
const digest = token => createHash('sha256').update(token).digest('hex');
const assets = {'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/market.js':['market.js','text/javascript'],'/style.css':['style.css','text/css']};

export function createApp({file='flatmate.sqlite', origin='http://localhost:3000', adminEmail, dubaiListings=false}={}) {
  const secure = new URL(origin).protocol === 'https:';
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'member');
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user INTEGER REFERENCES users(id),expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS profiles(user INTEGER PRIMARY KEY REFERENCES users(id),name TEXT,city TEXT,area TEXT,budget INTEGER,habits TEXT);
    CREATE TABLE IF NOT EXISTS listings(id INTEGER PRIMARY KEY,owner INTEGER REFERENCES users(id),title TEXT,city TEXT,area TEXT,rent INTEGER,description TEXT,authority TEXT,evidence TEXT,status TEXT DEFAULT 'pending',expires INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS interests(sender INTEGER REFERENCES users(id),recipient INTEGER REFERENCES users(id),PRIMARY KEY(sender,recipient));
    CREATE TABLE IF NOT EXISTS blocks(sender INTEGER REFERENCES users(id),recipient INTEGER REFERENCES users(id),PRIMARY KEY(sender,recipient));
    CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY,sender INTEGER REFERENCES users(id),recipient INTEGER REFERENCES users(id),body TEXT,created INTEGER);
    CREATE INDEX IF NOT EXISTS messages_pair ON messages(sender,recipient,id);
    CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY,reporter INTEGER REFERENCES users(id),kind TEXT,target INTEGER,reason TEXT,status TEXT DEFAULT 'open');
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,actor INTEGER REFERENCES users(id),action TEXT,target INTEGER,reason TEXT,created INTEGER);
  `);
  // Bootstrap only from an explicit local operator command, never from public registration.
  const promote = email => db.prepare("UPDATE users SET role='admin' WHERE email=?").run(email).changes;
  if(adminEmail && !promote(adminEmail)) throw new Error('Admin account does not exist.');
  const all = (sql,...args) => db.prepare(sql).all(...args);
  const get = (sql,...args) => db.prepare(sql).get(...args);
  const run = (sql,...args) => db.prepare(sql).run(...args);
  const blocked = (a,b) => get('SELECT 1 FROM blocks WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)',a,b,b,a);
  const connected = (a,b) => !blocked(a,b) && get('SELECT COUNT(*) AS n FROM interests WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)',a,b,b,a).n === 2;
  const cityOf = value => {
    if(!Object.hasOwn(cities,value)) fail(400,'Choose a supported city.');
    return value;
  };
  const transaction = fn => {
    db.exec('BEGIN IMMEDIATE');
    try { fn(); db.exec('COMMIT'); } catch(error) {db.exec('ROLLBACK'); throw error;}
  };
  const rate = new Map();

  const server = createServer(async(req,res)=>{
    const send = (status,data) => {
      res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});
      res.end(JSON.stringify(data));
    };
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const url = new URL(req.url,origin);
      const method = req.method;
      if(method==='GET' && Object.hasOwn(assets,url.pathname)){
        const [asset,type]=assets[url.pathname];
        res.writeHead(200,{'Content-Type':type+'; charset=utf-8'});
        return res.end(await readFile(new URL('./public/'+asset,import.meta.url)));
      }
      const path = url.pathname;
      if(!path.startsWith('/api/')) fail(404,'Page not found.');
      const now = Date.now();
      const cookie = req.headers.cookie?.match(/(?:^|; )flatmate=([a-f0-9]{64})(?:;|$)/)?.[1];
      const user = cookie && get('SELECT u.id,u.role FROM sessions s JOIN users u ON u.id=s.user WHERE s.token=? AND s.expires>?',digest(cookie),now);
      const id = user?.id;
      let body;
      if(method==='POST'){
        if(req.headers.origin!==origin) fail(403,'Origin denied.');
        if(req.headers['content-type']?.split(';')[0]!=='application/json') fail(415,'Use application/json.');
        const key = id ? 'user:'+id : 'ip:'+req.socket.remoteAddress;
        for(const [k,v] of rate) if(v.until<=now) rate.delete(k);
        const counter = rate.get(key) ?? {until:now+60000,count:0};
        rate.set(key,counter);
        if(++counter.count>(id?50:12)) fail(429,'Please wait before trying again.');
        const chunks=[]; let size=0;
        for await(const chunk of req){
          size+=chunk.length;
          if(size>16000) fail(413,'Request too large.');
          chunks.push(chunk);
        }
        try {body=JSON.parse(Buffer.concat(chunks));} catch {fail(400,'Invalid JSON.');}
        if(!body || typeof body!=='object' || Array.isArray(body)) fail(400,'Expected a JSON object.');
      }
      const setCookie = (token,age) => res.setHeader('Set-Cookie',`flatmate=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}${secure?'; Secure':''}`);
      if(method==='GET' && path==='/api/config') return send(200,{cities,habits,dubaiListings});
      if(method==='POST' && ['/api/register','/api/login'].includes(path)){
        const email=str(body.email,254).toLowerCase();
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400,'Enter a valid email.');
        const password=str(body.password,128,12);
        const account=get('SELECT * FROM users WHERE email=?',email);
        const salt=account?.password.split(':')[0] ?? randomBytes(16).toString('hex');
        const hashed=scryptSync(password,salt,64);
        let accountId;
        if(path.endsWith('/register')){
          if(body.adult!==true) fail(400,'Confirm you are 18 or older.');
          if(account) fail(409,'Unable to create this account.');
          accountId=run('INSERT INTO users(email,password) VALUES(?,?)',email,salt+':'+hashed.toString('hex')).lastInsertRowid;
        } else {
          if(!account || !timingSafeEqual(hashed,Buffer.from(account.password.split(':')[1],'hex'))) fail(401,'Email or password is incorrect.');
          accountId=account.id;
        }
        if(cookie) run('DELETE FROM sessions WHERE token=?',digest(cookie));
        run('DELETE FROM sessions WHERE expires<=?',now);
        const token=randomBytes(32).toString('hex');
        run('INSERT INTO sessions VALUES(?,?,?)',digest(token),accountId,now+604800000);
        setCookie(token,604800);
        return send(200,{ok:true});
      }
      if(!user) fail(401,'Sign in to continue.');
      if(method==='GET' && path==='/api/me'){
        const profile=get('SELECT * FROM profiles WHERE user=?',id);
        return send(200,{...user,profile:profile?{...profile,habits:JSON.parse(profile.habits)}:null});
      }
      if(method==='POST' && path==='/api/logout'){
        run('DELETE FROM sessions WHERE token=?',digest(cookie));
        setCookie('',0);
        return send(200,{ok:true});
      }
      if(method==='POST' && path==='/api/profile'){
        const answers={};
        for(const [key,options] of Object.entries(habits)){
          if(!options.includes(body.habits?.[key])) fail(400,'Choose an answer for every habit.');
          answers[key]=body.habits[key];
        }
        run('INSERT INTO profiles VALUES(?,?,?,?,?,?) ON CONFLICT(user) DO UPDATE SET name=excluded.name,city=excluded.city,area=excluded.area,budget=excluded.budget,habits=excluded.habits',id,str(body.name,60),cityOf(body.city),str(body.area,80),money(body.budget),JSON.stringify(answers));
        return send(200,{ok:true});
      }
      if(method==='GET' && path==='/api/matches'){
        const mine=get('SELECT * FROM profiles WHERE user=?',id);
        if(!mine) return send(200,[]);
        const own=JSON.parse(mine.habits);
        const rows=all('SELECT * FROM profiles p WHERE city=? AND user!=? AND NOT EXISTS(SELECT 1 FROM blocks WHERE (sender=? AND recipient=p.user) OR (sender=p.user AND recipient=?)) ORDER BY user LIMIT 500',mine.city,id,id,id);
        return send(200,rows.map(row=>{
          const other=JSON.parse(row.habits);
          const shared=Object.keys(habits).filter(k=>own[k]===other[k]);
          const close=Math.abs(row.budget-mine.budget)<=Math.max(row.budget,mine.budget)*0.25;
          return {id:row.user,name:row.name,city:row.city,area:row.area,budget:row.budget,habits:other,shared,score:shared.length*20+(close?20:0),connected:Boolean(connected(id,row.user)),interested:Boolean(get('SELECT 1 FROM interests WHERE sender=? AND recipient=?',id,row.user))};
        }).sort((a,b)=>b.score-a.score).slice(0,60));
      }
      if(method==='GET' && path==='/api/rooms'){
        const city=cityOf(url.searchParams.get('city'));
        const area=(url.searchParams.get('area')??'').trim().slice(0,80);
        return send(200,all("SELECT id,title,city,area,rent,description FROM listings l WHERE city=? AND instr(lower(area),lower(?))>0 AND status='approved' AND expires>? AND (? OR city!='Dubai') AND NOT EXISTS(SELECT 1 FROM blocks WHERE (sender=? AND recipient=l.owner) OR (sender=l.owner AND recipient=?)) ORDER BY id DESC LIMIT 60",city,area,now,Number(dubaiListings),id,id));
      }
      if(method==='GET' && path==='/api/my-rooms') return send(200,all('SELECT id,title,city,area,rent,status,expires FROM listings WHERE owner=? ORDER BY id DESC LIMIT 60',id));
      if(method==='POST' && path==='/api/rooms'){
        const city=cityOf(body.city);
        if(city==='Dubai' && (!dubaiListings || body.authority!=='operator')) fail(403,'Dubai room submissions require an enabled operator pilot.');
        if(!['owner','authorized-tenant','operator'].includes(body.authority)) fail(400,'Choose your listing authority.');
        run('INSERT INTO listings(owner,title,city,area,rent,description,authority,evidence) VALUES(?,?,?,?,?,?,?,?)',id,str(body.title,90),city,str(body.area,80),money(body.rent),str(body.description,800),body.authority,str(body.evidence,100));
        return send(201,{ok:true});
      }
      const match=path.match(/^\/api\/(interest|block|messages|room-interest|withdraw)\/(\d+)$/);
      if(match){
        const [,action,raw]=match;
        const target=Number(raw);
        if(action==='withdraw' && method==='POST'){
          if(!run("UPDATE listings SET status='withdrawn' WHERE id=? AND owner=? AND status IN ('pending','approved')",target,id).changes) fail(404,'Active listing not found.');
          return send(200,{ok:true});
        }
        if(action==='room-interest' && method==='POST'){
          const room=get("SELECT owner FROM listings WHERE id=? AND status='approved' AND expires>? AND (? OR city!='Dubai')",target,now,Number(dubaiListings));
          if(!room || room.owner===id || blocked(id,room.owner)) fail(404,'Room unavailable.');
          if(!get('SELECT 1 FROM profiles WHERE user=?',id) || !get('SELECT 1 FROM profiles WHERE user=?',room.owner)) fail(409,'Both people need a profile before connecting.');
          run('INSERT OR IGNORE INTO interests VALUES(?,?)',id,room.owner);
          return send(200,{connected:Boolean(connected(id,room.owner))});
        }
        if(target===id || !get('SELECT 1 FROM profiles WHERE user=?',target)) fail(404,'Profile unavailable.');
        if(action==='block' && method==='POST'){
          transaction(()=>{
            run('INSERT OR IGNORE INTO blocks VALUES(?,?)',id,target);
            run('DELETE FROM interests WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?)',id,target,target,id);
          });
          return send(200,{ok:true});
        }
        if(action==='interest' && method==='POST'){
          if(blocked(id,target)) fail(404,'Profile unavailable.');
          if(!get('SELECT 1 FROM profiles WHERE user=?',id)) fail(409,'Complete your profile first.');
          run('INSERT OR IGNORE INTO interests VALUES(?,?)',id,target);
          return send(200,{connected:Boolean(connected(id,target))});
        }
        if(action==='messages'){
          if(!connected(id,target)) fail(403,'Messaging requires mutual interest.');
          if(method==='GET') return send(200,all('SELECT id,sender,body,created FROM messages WHERE (sender=? AND recipient=?) OR (sender=? AND recipient=?) ORDER BY id DESC LIMIT 100',id,target,target,id).reverse());
          if(method==='POST'){
            run('INSERT INTO messages(sender,recipient,body,created) VALUES(?,?,?,?)',id,target,str(body.text,1200),now);
            return send(201,{ok:true});
          }
        }
      }
      if(method==='GET' && path==='/api/connections'){
        return send(200,all('SELECT p.user AS id,p.name,i.sender=? AS outgoing FROM interests i JOIN profiles p ON p.user=CASE WHEN i.sender=? THEN i.recipient ELSE i.sender END WHERE i.sender=? OR i.recipient=? ORDER BY p.user LIMIT 120',id,id,id,id).reduce((rows,row)=>{
          if(!rows.some(r=>r.id===row.id)) rows.push({id:row.id,name:row.name,connected:Boolean(connected(id,row.id)),outgoing:Boolean(get('SELECT 1 FROM interests WHERE sender=? AND recipient=?',id,row.id))});
          return rows;
        },[]));
      }
      if(method==='POST' && path==='/api/reports'){
        const target=body.target;
        if(!Number.isSafeInteger(target) || !['profile','room'].includes(body.kind)) fail(400,'Choose a valid report target.');
        const found=body.kind==='profile'?get('SELECT 1 FROM profiles WHERE user=? AND user!=?',target,id):get("SELECT 1 FROM listings WHERE id=? AND status='approved' AND expires>?",target,now);
        if(!found) fail(404,'Report target unavailable.');
        run('INSERT INTO reports(reporter,kind,target,reason) VALUES(?,?,?,?)',id,body.kind,target,str(body.reason,600));
        return send(201,{ok:true});
      }
      if(path.startsWith('/api/admin/') && user.role!=='admin') fail(403,'Moderator access required.');
      if(method==='GET' && path==='/api/admin/queue') return send(200,{
        rooms:all("SELECT * FROM listings WHERE status IN ('pending','approved') ORDER BY status DESC,id LIMIT 100"),
        reports:all("SELECT * FROM reports WHERE status='open' ORDER BY id LIMIT 100")
      });
      if(method==='POST' && path==='/api/admin/review'){
        const {kind,target,decision}=body;
        if(!Number.isSafeInteger(target)) fail(400,'Invalid review target.');
        const reason=str(body.reason,600,5);
        transaction(()=>{
          if(kind==='room'){
            const room=get('SELECT * FROM listings WHERE id=?',target);
            if(!room || room.owner===id) fail(403,'A separate moderator must review the room.');
            if(decision==='approve' && room.status==='pending'){
              if(room.city==='Dubai' && (!dubaiListings || room.authority!=='operator')) fail(403,'Dubai publication is disabled.');
              if(body.authorityChecked!==true || body.occupancyChecked!==true) fail(400,'Record both review checks.');
              run("UPDATE listings SET status='approved',expires=? WHERE id=?",now+30*86400000,target);
            } else if(decision==='remove' && ['pending','approved'].includes(room.status)){
              run("UPDATE listings SET status='removed' WHERE id=?",target);
            } else fail(409,'Invalid listing transition.');
          } else if(kind==='report' && decision==='resolve'){
            if(!run("UPDATE reports SET status='resolved' WHERE id=? AND status='open'",target).changes) fail(409,'Report already resolved or missing.');
          } else fail(400,'Invalid moderation decision.');
          run('INSERT INTO audit(actor,action,target,reason,created) VALUES(?,?,?,?,?)',id,kind+':'+decision,target,reason,now);
        });
        return send(200,{ok:true});
      }
      fail(404,'Action not found.');
    } catch(error){
      if(!error.status) console.error(error.code ?? error.name);
      send(error.status??500,{error:error.status?error.message:'Something went wrong.'});
    }
  });
  server.on('close',()=>db.close());
  return server;
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const port=Number(process.env.PORT??3000);
  const app=createApp({file:process.env.DB_FILE??'flatmate.sqlite',origin:process.env.APP_ORIGIN??`http://localhost:${port}`,adminEmail:process.env.PROMOTE_ADMIN,dubaiListings:process.env.DUBAI_LISTINGS==='enabled'});
  app.listen(port,process.env.BIND_HOST??'127.0.0.1',()=>console.log(`Flatmate listening on port ${port}`));
}
