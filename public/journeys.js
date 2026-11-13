const key='wiselabs-journeys-v1';
const personas={buyer:'Arjun · Buyer',seller:'Meera · Seller',seeker:'Rohan · Seeking flatmate',host:'Ananya · Hosting flatmate'};
let state;
try{state=JSON.parse(localStorage.getItem(key));}catch{}
state??={actor:'buyer',requests:[],messages:[],listings:[]};
let actor=Object.hasOwn(personas,state.actor)?state.actor:'buyer';
const persist=()=>{state.actor=actor;try{localStorage.setItem(key,JSON.stringify(state));}catch{alert('Storage is unavailable. Changes will last until this page closes.');}};
const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
const action=(text,fn)=>{const b=node('button',text);b.type='button';b.onclick=fn;return b;};
function modal(title){
const d=node('dialog');d.className='workspace-dialog';
const close=action('Close',()=>d.close());close.className='close';
const content=node('div');content.className='detail-copy';
content.append(node('h2',title));d.append(close,content);document.body.append(d);
d.addEventListener('close',()=>d.remove());d.showModal();return {d,content};
}
function field(form,label,type='text',value=''){
const l=node('label',label),input=node('input');input.type=type;input.value=value;input.required=true;l.append(input);form.append(l);return input;
}
function mine(){return state.requests.filter(r=>r.from===actor||r.to===actor);}
export function startRequest(title,kind){
if((kind==='flatmate'&&actor!=='seeker')||(kind==='property'&&actor!=='buyer')){
const {content}=modal('Choose the requesting persona');
content.append(node('p','Use the persona selector to become '+(kind==='flatmate'?personas.seeker:personas.buyer)+', then send this request.'));
return;
}
if(mine().some(r=>r.title===title&&r.status!=='declined'&&r.status!=='cancelled')){
workspace();return;
}
const {d,content}=modal(kind==='flatmate'?'Introduce yourself':'Enquire about this home');
const form=node('form'),message=field(form,'Your introduction');
message.maxLength=1000;message.value=kind==='flatmate'?'Hi, I would love to learn more about your household.':'Hi, is this home available for a viewing?';
form.append(node('button','Send request'));
form.onsubmit=e=>{
e.preventDefault();
const r={id:crypto.randomUUID(),title,kind,from:actor,to:kind==='flatmate'?'host':'seller',status:'pending',slot:null};
state.requests.push(r);state.messages.push({request:r.id,from:actor,text:message.value});
persist();d.close();workspace();
};content.append(form);
}
function workspace(){
const {content}=modal('Your conversations');
content.append(node('p','Viewing as '+personas[actor]+'. Switch personas in the header to experience the other side.'));
if(!mine().length)content.append(node('p','Explore a home or a flatmate profile and send your first request.'));
for(const r of mine()){
const card=node('article');card.className='card';
card.append(node('h3',r.title),node('p',personas[r.from]+' → '+personas[r.to]),node('p','Status · '+r.status));
if(r.status==='pending'&&r.to===actor){
for(const status of ['accepted','declined'])card.append(action(status==='accepted'?'Accept request':'Decline',()=>{r.status=status;persist();content.closest('dialog').close();workspace();}));
}
card.append(action('Open conversation',()=>conversation(r)));
content.append(card);
}
}
function conversation(r){
const {content}=modal(r.title);
content.append(node('p','Conversation with '+personas[r.from===actor?r.to:r.from]));
const history=node('div');
function messages(){
history.replaceChildren();
for(const m of state.messages.filter(m=>m.request===r.id))history.append(node('p',personas[m.from]+' — '+m.text));
}
messages();content.append(history);
if(r.status==='accepted'){
const form=node('form'),input=field(form,'Message');input.maxLength=1000;
form.append(node('button','Send'));
form.onsubmit=e=>{e.preventDefault();state.messages.push({request:r.id,from:actor,text:input.value});persist();input.value='';messages();};
content.append(form,action('Propose a meeting',()=>schedule(r)));
}
if(r.slot)content.append(node('p','Meeting · '+new Date(r.slot.time).toLocaleString()+' · '+r.slot.status));
}
function schedule(r){
const {d,content}=modal('Find a time to meet');
content.append(node('p','Times use your device timezone. Meetings last 30 minutes.'));
const form=node('form'),date=field(form,'Meeting date','date'),time=field(form,'Meeting time','time');
time.step=1800;
const place=field(form,'Meeting place or video-call details');
const status=node('p');status.setAttribute('role','status');
form.append(node('button','Propose time'),status);
form.onsubmit=e=>{
e.preventDefault();
const when=new Date(date.value+'T'+time.value);
if(!Number.isFinite(when.getTime())||when<=new Date()){status.textContent='Choose a future time.';return;}
const conflict=state.requests.some(other=>other.id!==r.id&&other.slot&&other.slot.status!=='cancelled'&&[r.from,r.to].some(id=>other.from===id||other.to===id)&&Math.abs(new Date(other.slot.time)-when)<1800000);
if(conflict){status.textContent='One of you already has a meeting at this time. Choose another slot.';return;}
r.slot={time:when.toISOString(),place:place.value,proposedBy:actor,status:'proposed'};
persist();d.close();calendar();
};content.append(form);
}
function calendar(){
const {content}=modal('Your calendar');
const meetings=mine().filter(r=>r.slot).sort((a,b)=>new Date(a.slot.time)-new Date(b.slot.time));
if(!meetings.length)content.append(node('p','Accept a request, then propose a meeting from the conversation.'));
for(const r of meetings){
const card=node('article');card.className='card';
card.append(node('h3',r.title),node('p',new Date(r.slot.time).toLocaleString()),node('p',r.slot.place),node('p',r.slot.status));
if(r.slot.status==='proposed'&&r.slot.proposedBy!==actor)card.append(action('Confirm meeting',()=>{r.slot.status='confirmed';persist();content.closest('dialog').close();calendar();}));
if(r.slot.status!=='cancelled')card.append(action('Cancel meeting',()=>{r.slot.status='cancelled';persist();content.closest('dialog').close();calendar();}));
content.append(card);
}
}
function listings(){
const {content}=modal('Seller studio');
if(actor!=='seller'){content.append(node('p','Switch to Meera · Seller to create and manage your sample listings.'));return;}
const form=node('form'),title=field(form,'Property title'),area=field(form,'Neighbourhood'),price=field(form,'Asking price','number');
price.min=1;title.maxLength=100;area.maxLength=80;
form.append(node('button','Publish sample property'));
form.onsubmit=e=>{e.preventDefault();state.listings.push({id:crypto.randomUUID(),title:title.value,area:area.value,price:Number(price.value)});persist();content.closest('dialog').close();listings();};
content.append(form);
for(const listing of state.listings){
const row=node('article');row.className='card';row.append(node('h3',listing.title),node('p',listing.area+' · '+listing.price.toLocaleString()),action('Withdraw',()=>{state.listings=state.listings.filter(x=>x.id!==listing.id);persist();content.closest('dialog').close();listings();}));content.append(row);
}
}
function published(){
const {content}=modal('Community properties');
if(!state.listings.length)content.append(node('p','Use the seller studio to publish a sample property, then switch to the buyer to enquire.'));
for(const listing of state.listings){
const row=node('article');row.className='card';row.append(node('h3',listing.title),node('p',listing.area+' · Asking price '+listing.price.toLocaleString()),action('Enquire',()=>startRequest(listing.title,'property')));content.append(row);
}
}
const bar=node('div');bar.className='persona-bar';
const label=node('label','Demo persona'),select=node('select');
for(const [id,name] of Object.entries(personas))select.add(new Option(name,id));
select.value=actor;select.onchange=()=>{actor=select.value;persist();document.querySelectorAll('dialog').forEach(d=>d.close());};
label.append(select);bar.append(label,action('Inbox',workspace),action('Calendar',calendar),action('Seller studio',listings),action('Community properties',published));
const hint=node('p','Shared demo on this browser · Switch personas to accept requests and confirm meetings.');hint.className='demo-label';
document.querySelector('header').after(bar,hint);
