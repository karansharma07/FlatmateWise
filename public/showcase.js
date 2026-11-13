const root=document.querySelector('main');
const locations={Bengaluru:['Indiranagar','HSR Layout','Whitefield'],Dubai:['Dubai Marina','Business Bay','Jumeirah Lakes Towers']};
let city='Bengaluru',category='Rent',saved=new Set(),onlySaved=false;
const photos=['photo-1600210492486-724fe5c67fb0','photo-1600607687920-4e2a09cf159d','photo-1600566753086-00f18fb6b3ea'];
const image=i=>'https://images.unsplash.com/'+photos[i%3]+'?auto=format&fit=crop&w=1100&q=85';
function button(text,fn){const b=document.createElement('button');b.textContent=text;b.onclick=fn;return b;}
function render(){
root.innerHTML=`<section class="pitch-hero"><div class="hero-photo"></div><div class="pitch-copy"><p class="eyebrow">WISELABS LIVING</p><h1>A place to live.<br>A life to love.</h1><p>Discover your neighbourhood, your home,<br>and the people who make it yours.</p></div><div class="search-panel"><div class="categories"></div><div class="search-fields"><label>Where<select id="city"><option>Bengaluru</option><option>Dubai</option></select></label><label>Neighbourhood<input id="search" placeholder="Search a neighbourhood"></label><button id="explore">Explore homes ↗</button></div></div></section><section class="collection"><div class="section-title"><div><p class="eyebrow">MAKE YOURSELF AT HOME</p><h2 id="collection-title"></h2></div><button id="saved">Saved homes (${saved.size})</button></div><p class="demo-label">Interactive concept · Illustrative properties, people and prices</p><div class="property-grid"></div></section><section class="feature"><div><p class="eyebrow">FLATMATEWISE</p><h2>Your kind of people.<br>Your kind of home.</h2><p>Early riser or night owl? Find the people who share your everyday rhythm.</p><button id="people">Explore flatmates ↗</button></div><div class="people-preview"><span>AM</span><span>RK</span><span>JL</span><p>Shared habits. Better conversations.</p></div></section>`;
document.querySelector('.hero-photo').style.backgroundImage='url('+image(0)+')';
for(const name of ['Rent','Buy','Flatmates','Short stays']){
const b=button(name,()=>{category=name;onlySaved=false;render();});
b.className=category===name?'selected':'';
document.querySelector('.categories').append(b);
}
const selector=document.querySelector('#city');selector.value=city;selector.onchange=()=>{city=selector.value;render();};
document.querySelector('#saved').onclick=()=>{onlySaved=!onlySaved;cards();};
document.querySelector('#explore').onclick=()=>{cards();document.querySelector('.collection').scrollIntoView({behavior:'smooth'});};
document.querySelector('#search').oninput=cards;
document.querySelector('#people').onclick=()=>{category='Flatmates';render();document.querySelector('.collection').scrollIntoView({behavior:'smooth'});};
cards();
}
function cards(){
const grid=document.querySelector('.property-grid');grid.replaceChildren();
document.querySelector('#collection-title').textContent=onlySaved?'Your shortlist':category==='Flatmates'?'People you could feel at home with':'A little more you. In '+city+'.';
const query=document.querySelector('#search').value.toLowerCase();
locations[city].forEach((area,i)=>{
const key=city+category+i;
if(!area.toLowerCase().includes(query)||(onlySaved&&!saved.has(key)))return;
const person=category==='Flatmates';
const title=person?['Ananya · Product designer','Rohan · Architect','Jamie · Researcher'][i]:['Light-filled living, room to breathe','A quiet corner of the city','Come home to something special'][i];
const price=city==='Dubai'?[8500,7200,9800][i]:[42000,36000,58000][i];
const display=category==='Buy'?(city==='Dubai'?'AED 1,850,000':'₹ 1.45 crore'):category==='Short stays'?(city==='Dubai'?'AED 450 / night':'₹ 3,500 / night'):(city==='Dubai'?'AED ':'₹ ')+(person?Math.round(price/3):price).toLocaleString('en-IN')+' / month';
const card=document.createElement('article');card.className='property-card';
card.innerHTML=`<div class="property-image"><img src="${image(i)}" alt="Illustrative furnished living room" loading="lazy"><span>Sample ${person?'profile':'home'}</span></div><div class="property-copy"><p class="area">${area} · ${city}</p><h3>${title}</h3><p>${person?'Early mornings · Smoke-free · Tidy spaces':'2 bedrooms · Furnished · Natural light'}</p><strong>${display}</strong><div class="card-actions"></div></div>`;
card.querySelector('.card-actions').append(button(person?'Meet '+title.split(' · ')[0]:'View home',()=>details(title,area,display,i,person)),button(saved.has(key)?'♥ Saved':'♡ Save',()=>{saved.has(key)?saved.delete(key):saved.add(key);document.querySelector('#saved').textContent='Saved homes ('+saved.size+')';cards();}));
grid.append(card);
});
if(!grid.children.length)grid.innerHTML='<p>No matches here. Try another neighbourhood or explore all homes.</p>';
}
function details(title,area,price,i,person){
const modal=document.createElement('dialog');
modal.innerHTML=`<button class="close" aria-label="Close details">✕</button><img class="detail-image" src="${image(i)}" alt="Illustrative living room"><div class="detail-copy"><p class="demo-label">Sample ${person?'profile':'property'} · Demonstration only</p><h2>${title}</h2><p>${area} · ${city}</p><h3>${price}</h3><p>${person?'Enjoys a calm home, shared meals and a clean kitchen. Looking for someone with a similar routine.':'A thoughtfully furnished home with generous light, comfortable spaces and room for your everyday rituals.'}</p><h3>${person?'Your conversation starter':'Plan your next step'}</h3><p>${person?'What does a good week at home look like for you?':'Explore the viewing request flow with a sample appointment.'}</p><label>Preferred day<input type="date" id="day"></label><button id="request">${person?'Try sending interest':'Try requesting a viewing'}</button><p id="response" role="status"></p></div>`;
document.body.append(modal);modal.querySelector('.close').onclick=()=>modal.close();modal.addEventListener('close',()=>modal.remove());
modal.querySelector('#request').onclick=()=>{modal.querySelector('#response').textContent='Demo request recorded for this preview. No message has been sent.';};
modal.showModal();
}
document.querySelector('header').innerHTML='<a class="brand" href="./">◒ WiseLabs <small>Living</small></a><span class="demo-label">Investor preview</span>';
render();
