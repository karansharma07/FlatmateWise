import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {Readable} from 'node:stream';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {localityMatches} from './public/market.js';
import {createApp} from './server.mjs';

test('neighbourhood discovery is case-insensitive and scoped to the selected city',()=>{
  assert.deepEqual(localityMatches('Bengaluru','  HSR '),['HSR Layout']);
  assert.deepEqual(localityMatches('Dubai','HSR'),[]);
  assert.deepEqual(localityMatches('Dubai','marina'),['Dubai Marina']);
});

test('member, marketplace and moderation request handler journeys',async t=>{
  const directory=await mkdtemp(join(tmpdir(),'flatmate-'));
  const file=join(directory,'test.sqlite');
  const origin='http://localhost';
  let app,base;
  const network=process.env.FLATMATE_HTTP_TEST==='1';
  async function start(adminEmail){
    app=createApp({file,origin,adminEmail});
    if(network){
      app.listen(0,'127.0.0.1');
      await once(app,'listening');
      base='http://127.0.0.1:'+app.address().port;
    }
  }
  async function stop(){
    if(network) await new Promise((resolve,reject)=>app.close(error=>error?reject(error):resolve()));
    else app.emit('close');
  }
  async function request(path,{headers={},method='GET',body}={}){
    if(network) return fetch(base+path,{headers,method,body});
    const req=Readable.from(body===undefined?[]:[Buffer.from(body)]);
    Object.assign(req,{url:path,headers,method,socket:{remoteAddress:'local-test'}});
    const resultHeaders=new Headers();
    return new Promise((resolve,reject)=>{
      const res={
        setHeader:(key,value)=>resultHeaders.set(key,value),
        writeHead(status,values){
          this.status=status;
          for(const [key,value] of Object.entries(values)) resultHeaders.set(key,value);
        },
        end(value){resolve(new Response(value,{status:this.status,headers:resultHeaders}));}
      };
      app.listeners('request')[0](req,res).catch(reject);
    });
  }
  await start();
  t.after(async()=>{await stop();await rm(directory,{recursive:true,force:true});});
  function browser(){
    let cookie;
    return async(path,body,status=200,requestOrigin=origin)=>{
      const headers={};
      if(cookie) headers.cookie=cookie;
      if(body!==undefined) Object.assign(headers,{origin:requestOrigin,'content-type':'application/json'});
      const response=await request('/api/'+path,{headers,method:body===undefined?'GET':'POST',body:body===undefined?undefined:JSON.stringify(body)});
      const set=response.headers.get('set-cookie');
      if(set) cookie=set.split(';')[0];
      const data=await response.json();
      assert.equal(response.status,status,JSON.stringify(data));
      return data;
    };
  }
  const alice=browser(),bob=browser(),admin=browser(),guest=browser();
  const register=(client,name)=>client('register',{email:name+'@example.test',password:'a long local test password',adult:true});
  await guest('matches',undefined,401);
  await guest('register',{email:'child@example.test',password:'a long local test password'},400);
  await register(alice,'alice');await register(bob,'bob');await register(admin,'admin');
  await stop();await start('admin@example.test');
  const a=await alice('me'), b=await bob('me');
  const profile={city:'Bengaluru',area:'HSR Layout',budget:15000,habits:{sleep:'Early',cleaning:'Daily',smoking:'Smoke-free',pets:'No pets'}};
  await alice('profile',{...profile,name:'Alice'},403,'http://other.test');
  await alice('profile',{...profile,name:'Alice'});
  await bob('profile',{...profile,name:'Bob'});
  assert.equal((await alice('matches'))[0].score,100);
  await alice('messages/'+b.id,{text:'Hello'},403);
  const room={title:'Private room',city:'Bengaluru',area:'HSR Layout',rent:14000,description:'Furnished private room',authority:'owner',evidence:'CASE-100'};
  await alice('rooms',{...room,city:'Dubai',authority:'operator'},403);
  await alice('rooms',room,201);
  assert.deepEqual(await bob('rooms?city=Bengaluru'),[]);
  await bob('admin/queue',undefined,403);
  const id=(await admin('admin/queue')).rooms[0].id;
  const review={kind:'room',target:id,decision:'approve',reason:'Authority and occupancy evidence checked'};
  await admin('admin/review',review,400);
  await admin('admin/review',{...review,authorityChecked:true,occupancyChecked:true});
  const [published]=await bob('rooms?city=Bengaluru');
  assert.equal(published.id,id);
  assert.equal((await bob('rooms?city=Bengaluru&area=hsr'))[0].id,id);
  assert.deepEqual(await bob('rooms?city=Bengaluru&area=Whitefield'),[]);
  assert.equal(Object.hasOwn(published,'evidence'),false);
  await bob('room-interest/'+id,{});
  assert.equal((await alice('connections'))[0].id,b.id);
  await alice('interest/'+b.id,{});
  await bob('messages/'+a.id,{text:'Can we schedule a viewing?'},201);
  assert.equal((await alice('messages/'+b.id))[0].body,'Can we schedule a viewing?');
  await bob('reports',{kind:'room',target:id,reason:'Review requested'},201);
  const report=(await admin('admin/queue')).reports[0];
  await admin('admin/review',{kind:'report',target:report.id,decision:'resolve',reason:'Follow-up complete'});
  await bob('withdraw/'+id,{},404);
  await alice('block/'+b.id,{});
  assert.deepEqual(await bob('rooms?city=Bengaluru'),[]);
  assert.deepEqual(await bob('matches'),[]);
  await bob('messages/'+a.id,undefined,403);
  await alice('withdraw/'+id,{});
  assert.equal((await alice('my-rooms'))[0].status,'withdrawn');
  await alice('logout',{});
  await alice('me',undefined,401);
  for(const path of ['/','/app.js','/market.js','/style.css']){
    const asset=await request(path);
    assert.equal(asset.status,200);
    assert.ok((await asset.text()).length>100);
  }
});
