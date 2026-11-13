import {markets,intents,localityMatches} from './market.js';
const nav=document.querySelector('#nav');
const view=document.querySelector('#view');
const notice=document.querySelector('#notice');
let me,config,page='Discover',market,peer,area='';
let destination='India',city='Bengaluru',intent='Find flatmates',query='',searched=false,continueToRooms=false;
const el=(tag,text,cls)=>{
  const node=document.createElement(tag);
  if(text) node.textContent=text;
  if(cls) node.className=cls;
  return node;
};
async function api(path,body){
  const response=await fetch('/api/'+path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json();
  if(!response.ok) throw Object.assign(new Error(data.error),{status:response.status});
  return data;
}
async function act(fn){
  notice.textContent='';
  try {await fn();} catch(error){notice.textContent=error.message;}
}
function button(label,fn,secondary=false){
  const node=el('button',label,secondary?'secondary':'');
  node.type='button';
  node.onclick=async()=>{
    node.disabled=true;
    try {await act(fn);} finally {node.disabled=false;}
  };
  return node;
}
function field(label,name,{type='text',value='',options,required=true}={}){
  const wrap=el('label',label);
  const input=el(options?'select':type==='textarea'?'textarea':'input');
  input.name=name;
  if(options) for(const option of options) input.add(new Option(option,option));
  else if(input.tagName==='INPUT') input.type=type;
  if(type==='checkbox') input.checked=Boolean(value);
  else if(value!=='' || !options) input.value=value;
  input.required=required;
  if(type==='number'){input.min=1;input.max=10000000;}
  if(type==='password') input.minLength=12;
  wrap.append(input);
  return wrap;
}
function form(fields,submit,fn){
  const node=el('form',null,'panel');
  const submitButton=el('button',submit);
  node.append(...fields,submitButton);
  node.onsubmit=async event=>{
    event.preventDefault();
    submitButton.disabled=true;
    try {await act(()=>fn(Object.fromEntries(new FormData(node))));} finally {submitButton.disabled=false;}
  };
  return node;
}
const heading=(name,parent=view)=>parent.append(el('h2',name));
const para=(text,parent=view)=>parent.append(el('p',text,'muted'));
const grid=()=>{const node=el('div',null,'grid');view.append(node);return node;};
const card=(parent,title,tag)=>{
  const node=el('article',null,'card');
  if(tag) node.append(el('span',tag,'tag'));
  node.append(el('h3',title));
  parent.append(node);
  return node;
};
const currency=(amount,city)=>new Intl.NumberFormat('en',{style:'currency',currency:config.cities[city],maximumFractionDigits:0}).format(amount);
function actions(parent,...buttons){const node=el('div',null,'actions');node.append(...buttons);parent.append(node);}
function report(kind,target){
  view.append(form([field('What happened?','reason',{type:'textarea'})],'Send report',async data=>{
    await api('reports',{...data,kind,target});
    await render();
    notice.textContent='Report sent to moderation.';
  }));
  view.lastChild.querySelector('textarea').focus();
}
function marketplace(){
  const section=document.querySelector('#marketplace');
  section.replaceChildren();
  heading('Explore '+city,section);
  const choices=el('div',null,'intent-grid');
  const labels=['Find a long-term rental','Explore homes for sale','Meet people and find rooms','Find furnished accommodation'];
  intents.forEach((name,index)=>{
    const choice=button(name,()=>{
      intent=name;searched=false;marketplace();
      section.querySelectorAll('.intent-grid button')[index].focus();
    },true);
    choice.append(el('small',labels[index]));
    choice.setAttribute('aria-pressed',String(intent===name));
    choices.append(choice);
  });
  section.append(choices);
  const marketConfig=markets[destination];
  const destinationField=field('Market','destination',{options:Object.keys(markets),value:destination});
  destinationField.querySelector('select').onchange=event=>{
    destination=event.target.value;
    city=Object.keys(markets[destination].cities)[0];
    query='';searched=false;marketplace();
    section.querySelector('[name=destination]').focus();
  };
  const cityField=field('City','city',{options:Object.keys(marketConfig.cities),value:city});
  cityField.querySelector('select').onchange=event=>{
    city=event.target.value;query='';searched=false;marketplace();
    section.querySelector('[name=city]').focus();
  };
  section.append(form([destinationField,cityField,
    field(marketConfig.location,'query',{value:query,required:false})],'Explore neighbourhoods',async data=>{
    query=data.query.trim();searched=true;marketplace();
    section.querySelector('[tabindex="-1"]').focus();
  }));
  para(marketConfig.pricing,section);
  if(!searched) return;
  const results=el('div',null,'card');
  results.tabIndex=-1;
  section.append(results);
  results.append(el('h3',intent+' in '+city));
  const matches=localityMatches(city,query);
  para(matches.length?matches.join(' · '):'No matching neighbourhood in the starter directory.',results);
  if(intent!=='Find flatmates'){
    para('This category is planned. You can explore neighbourhoods today.',results);
    return;
  }
  if(city==='Dubai'&&!config.dubaiListings) para('Dubai room publication is closed. Set up a Dubai profile to discover flatmates.',results);
  else actions(results,button(me?'Browse reviewed rooms':'Sign in to browse rooms',async()=>{
    market=city;area=query;continueToRooms=!me;
    page=me?'Rooms':'Sign in';
    await render();
    view.querySelector('h2')?.scrollIntoView({block:'start'});
  }));
}
async function refresh(){
  try {me=await api('me');} catch(error){if(error.status!==401) throw error;me=null;}
}
async function render(){
  marketplace();
  nav.replaceChildren();
  view.replaceChildren();
  if(!me){
    heading(page==='Create account'?'Create your account':'Welcome to Flatmate');
    const register=page==='Create account';
    const fields=[field('Email','email',{type:'email'}),field('Password','password',{type:'password'})];
    if(register) fields.push(field('I am 18 or older','adult',{type:'checkbox'}));
    view.append(form(fields,register?'Create account':'Sign in',async data=>{
      await api(register?'register':'login',{...data,adult:data.adult==='on'});
      await refresh();page=continueToRooms?'Rooms':me.profile?'Discover':'Profile';continueToRooms=false;await render();
    }));
    nav.append(button(register?'Sign in':'Create account',async()=>{page=register?'Sign in':'Create account';await render();},true));
    return;
  }
  const pages=['Discover','Rooms','Inbox','Profile',...(me.role==='admin'?['Moderation']:[])];
  for(const name of pages){
    const item=button(name,async()=>{page=name;peer=null;await render();},true);
    if(page===name) item.setAttribute('aria-current','true');
    nav.append(item);
  }
  nav.append(button('Sign out',async()=>{await api('logout',{});me=null;peer=null;market=null;page='Sign in';await render();},true));
  if(page==='Profile'){
    heading('Your living preferences');
    para('Your display name, area, budget and habits are visible to signed-in members searching in your city.');
    const profile=me.profile??{};
    view.append(form([
      field('Display name','name',{value:profile.name}),field('City','city',{options:Object.keys(config.cities),value:profile.city}),
      field('Preferred neighbourhood','area',{value:profile.area}),field('Monthly budget in local currency','budget',{type:'number',value:profile.budget}),
      ...Object.entries(config.habits).map(([key,options])=>field(key[0].toUpperCase()+key.slice(1),key,{options,value:profile.habits?.[key]}))
    ],'Save profile',async data=>{
      await api('profile',{...data,budget:Number(data.budget),habits:Object.fromEntries(Object.keys(config.habits).map(key=>[key,data[key]]))});
      await refresh();market=null;page='Discover';await render();
    }));
  }
  if(page==='Discover'){
    heading('FlatmateWise');
    if(!me.profile) return actions(view,button('Set up your profile',async()=>{page='Profile';await render();}));
    const rows=await api('matches');
    if(!rows.length) para('No profiles to show in your city yet.');
    const list=grid();
    for(const person of rows){
      const node=card(list,person.name,person.score+' / 100 compatibility');
      para(person.area+' · '+currency(person.budget,person.city)+' monthly budget',node);
      para(Object.values(person.habits).join(' · '),node);
      if(person.shared.length) para('Shared habits: '+person.shared.join(', '),node);
      actions(node,button(person.connected?'Message':person.interested?'Interest sent':'Send interest',async()=>{
        if(person.connected){page='Inbox';peer=person.id;} else await api('interest/'+person.id,{});
        await render();
      }),button('Report',()=>report('profile',person.id),true),button('Block',async()=>{await api('block/'+person.id,{});await render();},true));
    }
  }
  if(page==='Rooms'){
    heading('Browse rooms');
    market??=me.profile?.city??'Bengaluru';
    const selector=field('Market','city',{options:Object.keys(config.cities),value:market});
    selector.querySelector('select').onchange=event=>act(async()=>{market=event.target.value;area='';await render();});
    view.append(selector);
    view.append(form([field('Filter by neighbourhood','area',{value:area,required:false})],'Filter rooms',async data=>{area=data.area;await render();}));
    const [rows,own]=await Promise.all([api('rooms?city='+encodeURIComponent(market)+'&area='+encodeURIComponent(area)),api('my-rooms')]);
    const allowed=market!=='Dubai'||config.dubaiListings;
    if(!allowed) para('Dubai room publication is closed. Flatmate discovery is available.');
    else if(!rows.length) para('No reviewed rooms are available in this market yet.');
    const list=grid();
    for(const room of rows){
      const node=card(list,room.title,'Moderator reviewed');
      para(room.area+' · '+currency(room.rent,room.city)+' / month',node);
      para(room.description,node);
      actions(node,button('Ask to connect',async()=>{await api('room-interest/'+room.id,{});notice.textContent='Interest sent. Check your inbox for updates.';}),button('Report',()=>report('room',room.id),true));
    }
    if(own.length){
      view.append(el('h2','Your submissions','section-gap'));
      const submitted=grid();
      for(const room of own){
        const state=room.status==='approved'&&room.expires<=Date.now()?'expired':room.status;
        const node=card(submitted,room.title,state);
        para(room.city,node);
        if(['pending','approved'].includes(room.status)) actions(node,button('Withdraw',async()=>{await api('withdraw/'+room.id,{});await render();},true));
      }
    }
    if(allowed){
      view.append(el('h2','Submit a room in '+market,'section-gap'));
      para('Use an internal review reference from WiseLabs. Keep identity numbers, documents, exact addresses and contact details out of this form.');
      view.append(form([field('Title','title'),field('Neighbourhood','area'),field('Monthly rent in '+config.cities[market],'rent',{type:'number'}),field('Description','description',{type:'textarea'}),field('Listing authority','authority',{options:market==='Dubai'?['operator']:['owner','authorized-tenant','operator']}),field('Review reference','evidence')],'Submit for review',async data=>{
        await api('rooms',{...data,city:market,rent:Number(data.rent)});await render();notice.textContent='Room submitted for review.';
      }));
    }
  }
  if(page==='Inbox'){
    heading('Inbox');
    const rows=await api('connections');
    if(!rows.length) para('Send interest to start a connection. Messaging opens when both people agree.');
    const list=grid();
    for(const row of rows){
      const node=card(list,row.name,row.connected?'Connected':row.outgoing?'Interest sent':'Interested in connecting');
      actions(node,button(row.connected?'Open conversation':'Accept',async()=>{if(!row.connected) await api('interest/'+row.id,{});peer=row.id;await render();}),button('Block',async()=>{await api('block/'+row.id,{});peer=null;await render();},true),button('Report',()=>report('profile',row.id),true));
    }
    const partner=rows.find(row=>row.id===peer&&row.connected);
    if(partner){
      view.append(el('h2',partner.name,'section-gap'));
      const messages=el('ol',null,'messages');
      for(const msg of await api('messages/'+peer)) messages.append(el('li',(msg.sender===me.id?'You':partner.name)+': '+msg.body));
      view.append(messages,form([field('Message','text',{type:'textarea'})],'Send message',async data=>{await api('messages/'+peer,data);await render();}));
      actions(view,button('Refresh conversation',render,true));
    }
  }
  if(page==='Moderation'){
    heading('Moderation queue');
    const {rooms,reports}=await api('admin/queue');
    if(!rooms.length&&!reports.length) para('The queue is clear.');
    const list=grid();
    for(const room of rooms){
      const node=card(list,room.title,room.status);
      para([room.city,room.area,room.authority,room.evidence].join(' · '),node);
      para(room.description,node);
      const fields=[field('Decision','decision',{options:room.status==='pending'?['approve','remove']:['remove']}),field('Authority checked','authorityChecked',{type:'checkbox',required:false}),field('Occupancy and local rules checked','occupancyChecked',{type:'checkbox',required:false}),field('Decision reason','reason')];
      node.append(form(fields,'Record decision',async data=>{
        await api('admin/review',{...data,kind:'room',target:room.id,authorityChecked:data.authorityChecked==='on',occupancyChecked:data.occupancyChecked==='on'});await render();
      }));
    }
    for(const item of reports){
      const node=card(list,item.kind+' #'+item.target,'Open report');
      para(item.reason,node);
      node.append(form([field('Resolution reason','reason')],'Resolve',async data=>{await api('admin/review',{...data,kind:'report',target:item.id,decision:'resolve'});await render();}));
    }
  }
}
await act(async()=>{config=await api('config');await refresh();await render();});
