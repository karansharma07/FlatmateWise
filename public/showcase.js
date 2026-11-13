const root=document.querySelector('main');
const locations={Bengaluru:['Indiranagar','HSR Layout','Whitefield'],Dubai:['Dubai Marina','Business Bay','Jumeirah Lakes Towers']};
let city='Bengaluru',category='Flatmates',saved=new Set(),onlySaved=false;
let preferences={sleep:'Early mornings',cleaning:'Daily reset',social:'Quiet evenings'};
const people=[
{name:'Ananya',sleep:'Early mornings',cleaning:'Daily reset',social:'Quiet evenings'},
{name:'Rohan',sleep:'Late nights',cleaning:'Weekly clean',social:'Friends welcome'},
{name:'Jamie',sleep:'Early mornings',cleaning:'Weekly clean',social:'Quiet evenings'}
];
function fit(index){
return Object.keys(preferences).filter(key=>preferences[key]===people[index][key]);
}
function preferencePanel(){
const panel=document.createElement('section');
panel.className='fit-panel';
panel.innerHTML='<div><p class="eyebrow">FLATMATEWISE</p><h2>A home starts with the people.</h2><p>Set your rhythm. Explore how shared habits change your shortlist.</p></div><div class="fit-fields"></div>';
for(const [key,options] of Object.entries({sleep:['Early mornings','Late nights'],cleaning:['Daily reset','Weekly clean'],social:['Quiet evenings','Friends welcome']})){
const label=document.createElement('label');
label.textContent={sleep:'Your schedule',cleaning:'Keeping things clean',social:'Life at home'}[key];
const select=document.createElement('select');
for(const value of options)select.add(new Option(value,value));
select.value=preferences[key];
select.onchange=()=>{preferences[key]=select.value;cards();};
label.append(select);panel.querySelector('.fit-fields').append(label);
}
return panel;
}
const photos=['photo-1600210492486-724fe5c67fb0','photo-1600607687920-4e2a09cf159d','photo-1600566753086-00f18fb6b3ea'];
const image=i=>'https://images.unsplash.com/'+photos[i%3]+'?auto=format&fit=crop&w=1100&q=85';
function button(text,fn){const b=document.createElement('button');b.textContent=text;b.onclick=fn;return b;}
function render(){
root.innerHTML=`<section class="pitch-hero"><div class="hero-photo"></div><div class="pitch-copy"><p class="eyebrow">WISELABS LIVING</p><h1>Find your place.<br>Find your people.</h1><p>From your first flatmate to your next home.<br>A more thoughtful way to move.</p><button id="hero-match">Find my kind of flatmate ↗</button></div><div class="search-panel"><div class="categories"></div><div class="search-fields"><label>Where<select id="city"><option>Bengaluru</option><option>Dubai</option></select></label><label>Neighbourhood<input id="search" placeholder="Search a neighbourhood"></label><button id="explore">Explore homes ↗</button></div></div></section><section class="collection"><div class="section-title"><div><p class="eyebrow">MAKE YOURSELF AT HOME</p><h2 id="collection-title"></h2></div><button id="saved">Saved homes (${saved.size})</button></div><p class="demo-label">Interactive concept · Illustrative properties, people and prices</p><div class="property-grid"></div></section><section class="feature"><div><p class="eyebrow">FLATMATEWISE</p><h2>Your kind of people.<br>Your kind of home.</h2><p>Early riser or night owl? Find the people who share your everyday rhythm.</p><button id="people">Explore flatmates ↗</button></div><div class="people-preview"><span>AM</span><span>RK</span><span>JL</span><p>Shared habits. Better conversations.</p></div></section>`;
document.querySelector('.hero-photo').style.backgroundImage='url('+image(0)+')';
for(const name of ['Rent','Buy','Flatmates','Short stays']){
const b=button(name==='Flatmates'?'FlatmateWise':name,()=>{category=name;onlySaved=false;render();});
b.className=category===name?'selected':'';
document.querySelector('.categories').append(b);
}
const selector=document.querySelector('#city');selector.value=city;selector.onchange=()=>{city=selector.value;render();};
document.querySelector('#saved').onclick=()=>{onlySaved=!onlySaved;cards();};
document.querySelector('#explore').onclick=()=>{cards();document.querySelector('.collection').scrollIntoView({behavior:'smooth'});};
document.querySelector('#search').oninput=cards;
document.querySelector('#people').onclick=()=>{category='Flatmates';render();document.querySelector('.collection').scrollIntoView({behavior:'smooth'});};
document.querySelector('#hero-match').onclick=()=>{
category='Flatmates';onlySaved=false;render();document.querySelector('.fit-panel').scrollIntoView({behavior:'smooth'});
};
if(category==='Flatmates')document.querySelector('.collection').before(preferencePanel());
const journey=document.createElement('section');journey.className='journey';
journey.innerHTML='<p class="eyebrow">YOUR NEXT CHAPTER</p><h2>One move. So many possibilities.</h2><div class="journey-grid"></div>';
for(const [label,target,description] of [
['Land softly','Short stays','Explore a furnished place while you find your feet.'],
['Find your people','Flatmates','Build a shortlist around the way you live.'],
['Make it home','Rent','Explore a longer-term place in your neighbourhood.'],
['Put down roots','Buy','Discover the next chapter of home ownership.']
]){
const item=button(label,()=>{category=target;onlySaved=false;render();document.querySelector('.collection').scrollIntoView({behavior:'smooth'});});
const text=document.createElement('span');text.textContent=description;item.append(text);
journey.querySelector('.journey-grid').append(item);
}
root.append(journey);
cards();
}
function cards(){
const grid=document.querySelector('.property-grid');grid.replaceChildren();
document.querySelector('#collection-title').textContent=onlySaved?'Your shortlist':category==='Flatmates'?'People you could feel at home with':'A little more you. In '+city+'.';
const query=document.querySelector('#search').value.toLowerCase();
locations[city].map((area,i)=>({area,i})).sort((a,b)=>category==='Flatmates'?fit(b.i).length-fit(a.i).length:a.i-b.i).forEach(({area,i})=>{
const key=city+category+i;
if(!area.toLowerCase().includes(query)||(onlySaved&&!saved.has(key)))return;
const person=category==='Flatmates';
const title=person?['Ananya · Product designer','Rohan · Architect','Jamie · Researcher'][i]:['Light-filled living, room to breathe','A quiet corner of the city','Come home to something special'][i];
const price=city==='Dubai'?[8500,7200,9800][i]:[42000,36000,58000][i];
const display=category==='Buy'?(city==='Dubai'?'AED 1,850,000':'₹ 1.45 crore'):category==='Short stays'?(city==='Dubai'?'AED 450 / night':'₹ 3,500 / night'):(city==='Dubai'?'AED ':'₹ ')+(person?Math.round(price/3):price).toLocaleString('en-IN')+' / month';
const card=document.createElement('article');card.className='property-card';
card.innerHTML=`<div class="property-image"><img src="${image(i)}" alt="Illustrative furnished living room" loading="lazy"><span>Sample ${person?'profile':'home'}</span></div><div class="property-copy"><p class="area">${area} · ${city}</p><h3>${title}</h3><p>${person?'Early mornings · Smoke-free · Tidy spaces':'2 bedrooms · Furnished · Natural light'}</p><strong>${display}</strong><div class="card-actions"></div></div>`;
if(person){
const visual=card.querySelector('.property-image');
visual.className='profile-visual profile-'+i;
visual.replaceChildren();
const initials=document.createElement('div');initials.className='initials';initials.textContent=people[i].name.slice(0,1);
const match=document.createElement('p');match.textContent=fit(i).length+' of 3 habits aligned';
visual.append(initials,match);
card.querySelector('.property-copy > p:not(.area)').textContent=Object.keys(preferences).map(key=>people[i][key]).join(' · ');
}
card.querySelector('.card-actions').append(button(person?'Meet '+title.split(' · ')[0]:'View home',()=>details(title,area,display,i,person)),button(saved.has(key)?'♥ Saved':'♡ Save',()=>{saved.has(key)?saved.delete(key):saved.add(key);document.querySelector('#saved').textContent='Saved homes ('+saved.size+')';cards();}));
grid.append(card);
});
if(!grid.children.length)grid.innerHTML='<p>No matches here. Try another neighbourhood or explore all homes.</p>';
}
function details(title,area,price,i,person){
const modal=document.createElement('dialog');
modal.innerHTML=`<button class="close" aria-label="Close details">✕</button><img class="detail-image" src="${image(i)}" alt="Illustrative living room"><div class="detail-copy"><p class="demo-label">Sample ${person?'profile':'property'} · Demonstration only</p><h2>${title}</h2><p>${area} · ${city}</p><h3>${price}</h3><p>${person?'Enjoys a calm home, shared meals and a clean kitchen. Looking for someone with a similar routine.':'A thoughtfully furnished home with generous light, comfortable spaces and room for your everyday rituals.'}</p><h3>${person?'Your conversation starter':'Plan your next step'}</h3><p>${person?'What does a good week at home look like for you?':'Explore the viewing request flow with a sample appointment.'}</p><label>Preferred day<input type="date" id="day"></label><button id="request">${person?'Try sending interest':'Try requesting a viewing'}</button><p id="response" role="status"></p></div>`;
if(person){
modal.querySelector('.detail-image').remove();
const explanation=document.createElement('p');
const shared=fit(i).map(key=>preferences[key]);
explanation.textContent=shared.length?'Shared preferences: '+shared.join(', ')+'. Compare the remaining habits together.':'Your selected habits differ. Discuss your expectations before deciding.';
modal.querySelector('.detail-copy').prepend(explanation);
modal.querySelector('label').remove();
}
document.body.append(modal);modal.querySelector('.close').onclick=()=>modal.close();modal.addEventListener('close',()=>modal.remove());
modal.querySelector('#request').onclick=()=>{modal.querySelector('#response').textContent='Demo request recorded for this preview. No message has been sent.';};
modal.showModal();
}
document.querySelector('header').innerHTML='<a class="brand" href="./">◒ WiseLabs <small>Living</small></a><span class="demo-label">Investor preview</span>';
render();
