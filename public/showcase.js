import {startRequest} from './journeys.js';
import {getNeighbourhood} from './neighbourhood-data.js';
import {inventory, markets, money, photo} from './showcase-homes.js';
import {mountHousingAssistant} from './housing-assistant.js';

for (const file of ['showcase.css','housing-assistant.css']) {
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=new URL(file,import.meta.url);
  document.head.append(link);
}

const root=document.querySelector('main');
const locations=Object.fromEntries(Object.entries(markets).map(([city,rooms])=>[city,rooms.map(room=>room.area)]));
const categories=['Flatmates','Rent','Buy','Short stays'];
const labels={Flatmates:'FlatmateWise',Rent:'Rent',Buy:'Buy','Short stays':'Short stays'};
const habits=[['Schedule','Early mornings','Late nights'],['Cleaning','Daily reset','Weekly clean'],['Evenings','Quiet evenings','Friends welcome']];
const preferences=habits.map(([,first])=>first);
const savedKey='wiselabs-showcase-shortlist';
function readShortlist(){
  try {
    const list=JSON.parse(localStorage.getItem(savedKey));
    return Array.isArray(list)?list.filter(id=>typeof id==='string'):[];
  } catch {
    return [];
  }
}
const saved=new Set(readShortlist());
let city='Bengaluru',category='Flatmates',area='',filters={},onlySaved=false;

function element(tag,text,cls){
  const item=document.createElement(tag);
  if(text) item.textContent=text;
  if(cls) item.className=cls;
  return item;
}
function button(text,fn,cls){
  const item=element('button',text,cls);
  item.type='button';
  item.onclick=fn;
  return item;
}
function source(text,url){
  const item=element('a',text);
  item.href=url;
  item.target='_blank';
  item.rel='noopener noreferrer';
  return item;
}
function price(home){return [money(home.price,home.city),home.period].filter(Boolean).join(' ');}
function fit(home){return home.habits.filter((answer,i)=>answer===preferences[i]);}
function browse(){
  const title=document.querySelector('#results-title');
  title.focus({preventScroll:true});
  title.scrollIntoView({block:'start'});
}
function applySearch(next){
  ({city,category}=next);
  area=next.area??'';
  filters=next;
  onlySaved=false;
  render();
  browse();
}
function clearFilters(){
  area='';
  filters={};
  onlySaved=false;
  render();
  browse();
}
function render(){
  root.innerHTML=`
    <section class="pitch-hero">
      <div class="hero-photo"></div>
      <div class="pitch-copy"><p class="eyebrow">WISELABS LIVING</p>
      <h1>Find your place.<br>Find your people.</h1>
      <p>Explore homes, meet future flatmates, and plan your next move.</p>
      <div class="hero-actions"></div></div>
      <div class="search-panel"><div class="categories" aria-label="Housing category"></div>
        <div class="search-fields">
          <label>City<select id="city"><option>Bengaluru</option><option>Dubai</option></select></label>
          <label>Neighbourhood<input id="search" placeholder="Any neighbourhood" list="area-options"><datalist id="area-options"></datalist></label>
          <button id="explore">See results</button>
        </div>
      </div>
    </section>
    <div class="housing-tools"><div id="assistant"></div><div id="lifestyle"></div></div>
    <section class="collection" aria-labelledby="results-title">
      <div class="section-title"><div><h2 id="results-title" tabindex="-1"></h2><p id="result-count" role="status"></p></div><div class="shortlist-actions"><button id="saved"></button><button id="compare" class="secondary" hidden>Compare saved homes</button></div></div>
      <div id="active-filters"></div>
      <p class="demo-label">Demo homes, hosts and illustrative photos. Neighbourhood facts include source links.</p>
      <div class="property-grid"></div>
    </section>`;
  root.querySelector('.hero-photo').style.backgroundImage='url('+photo(0,1800)+')';
  const assistant=mountHousingAssistant(root.querySelector('#assistant'),{locations,context:{city,category},onSearch:applySearch});
  root.querySelector('.hero-actions').append(
    button('Explore FlatmateWise',()=>applySearch({city,category:'Flatmates'})),
    button('Ask the housing assistant',()=>assistant.focus(),'hero-secondary')
  );
  for(const name of categories){
    const tab=button(labels[name],()=>{category=name;filters={};onlySaved=false;render();root.querySelector('[aria-pressed="true"]').focus();});
    tab.className=category===name?'selected':'';
    tab.setAttribute('aria-pressed',String(category===name));
    root.querySelector('.categories').append(tab);
  }
  const selector=root.querySelector('#city');
  selector.value=city;
  selector.onchange=()=>{city=selector.value;area='';filters={};onlySaved=false;render();root.querySelector('#city').focus();};
  const input=root.querySelector('#search');
  input.value=area;
  for(const name of locations[city]) root.querySelector('#area-options').append(new Option(name));
  input.oninput=()=>{area=input.value;cards();};
  input.onkeydown=event=>{if(event.key==='Enter') browse();};
  root.querySelector('#saved').onclick=()=>{onlySaved=!onlySaved;cards();};
  root.querySelector('#explore').onclick=browse;
  root.querySelector('#compare').onclick=compareSaved;
  const lifestyle=root.querySelector('#lifestyle');
  if(category==='Flatmates') lifestyle.append(preferencePanel());
  else lifestyle.remove();
  cards();
}
function preferencePanel(){
  const section=element('section',null,'lifestyle-panel');
  section.append(element('h2','Your household preferences'),element('p','See which hosts share your everyday habits.'));
  for(const [i,[name,...options]] of habits.entries()){
    const label=element('label',name);
    const select=element('select');
    for(const option of options) select.add(new Option(option));
    select.value=preferences[i];
    select.onchange=()=>{preferences[i]=select.value;cards();};
    label.append(select);
    section.append(label);
  }
  return section;
}
function cards(){
  const grid=root.querySelector('.property-grid');
  grid.replaceChildren();
  const title=root.querySelector('#results-title');
  title.textContent=onlySaved?'Your shortlist':(category==='Flatmates'?'Rooms and flatmates':'Homes to '+(category==='Short stays'?'stay in':category.toLowerCase()))+' in '+city;
  const savedButton=root.querySelector('#saved');
  savedButton.textContent=onlySaved?'Show all results':'Shortlist ('+saved.size+')';
  savedButton.setAttribute('aria-pressed',String(onlySaved));
  root.querySelector('#compare').hidden=!onlySaved||saved.size<2;
  const filterBar=root.querySelector('#active-filters');
  filterBar.replaceChildren();
  const chips=onlySaved?[]:[
    area.trim(),filters.bedrooms!=null?filters.bedrooms+' bedrooms':null,
    filters.maxPrice!=null?'Up to '+money(filters.maxPrice,city)+(filters.pricePeriod?' / '+filters.pricePeriod:''):null,
    ...(filters.amenities??[])
  ].filter(Boolean);
  for(const chip of chips) filterBar.append(element('span',chip,'fact'));
  if(chips.length) filterBar.append(button('Clear filters',clearFilters,'secondary'));
  const catalog=onlySaved
    ? Object.keys(markets).flatMap(market=>categories.flatMap(kind=>inventory(market,kind)))
    : inventory(city,category);
  const homes=catalog.filter(home=>{
    if(onlySaved) return saved.has(home.id);
    let comparable=home.price;
    if(filters.pricePeriod && filters.maxPrice!=null && home.period!=='/ '+filters.pricePeriod){
      if(home.period==='/ year'&&filters.pricePeriod==='month') comparable/=12;
      else if(home.period==='/ month'&&filters.pricePeriod==='year') comparable*=12;
      else return false;
    }
    return (!onlySaved||saved.has(home.id))&&home.area.toLowerCase().includes(area.trim().toLowerCase())&&
      (filters.maxPrice==null||comparable<=filters.maxPrice)&&
      (filters.bedrooms==null||home.bedrooms===filters.bedrooms)&&
      (filters.amenities??[]).every(amenity=>home.amenities.includes(amenity));
  });
  if(category==='Flatmates') homes.sort((a,b)=>fit(b).length-fit(a).length);
  root.querySelector('#result-count').textContent=homes.length+' '+(homes.length===1?'result':'results');
  if(!homes.length) grid.append(element('p',onlySaved?'Save a home or room to add it to your shortlist.':'No homes match this view. Clear your filters or switch city.'));
  for(const home of homes) grid.append(card(home));
}
function card(home){
  const person=home.category==='Flatmates';
  const item=element('article',null,'property-card');
  const cover=element('div',null,'property-image');
  const image=element('img');
  image.src=photo(home.index,780);
  image.alt='Illustrative apartment interior';
  image.loading='lazy';
  cover.append(image,element('span','Illustrative photo'));
  const body=element('div',null,'property-copy');
  body.append(element('p',home.area+' · '+home.city,'area'),element('h3',home.title),element('strong',price(home)));
  if(person) body.append(element('p','Hosted by '+home.host+' · '+fit(home).length+' of '+habits.length+' habits align','match-line'));
  body.append(element('p',home.bedrooms+' bedrooms · '+home.baths+' baths · '+home.size.toLocaleString()+' sq ft'));
  const actions=element('div',null,'card-actions');
  const open=button(person?'View room and host':'View home',()=>details(home));
  const save=button(saved.has(home.id)?'♥ Saved':'♡ Save',()=>{
    if(saved.has(home.id)) saved.delete(home.id); else saved.add(home.id);
    try { localStorage.setItem(savedKey,JSON.stringify([...saved])); } catch {}
    cards();
    (root.querySelector('[data-save="'+CSS.escape(home.id)+'"]')??root.querySelector('#saved')).focus();
  });
  save.dataset.save=home.id;
  save.setAttribute('aria-pressed',String(saved.has(home.id)));
  actions.append(open,save);
  body.append(actions);
  item.append(cover,body);
  return item;
}
function compareSaved(){
  const homes=Object.keys(markets).flatMap(market=>categories.flatMap(kind=>inventory(market,kind))).filter(home=>saved.has(home.id));
  const dialog=element('dialog',null,'apartment-dialog');
  const close=button('✕',()=>dialog.close(),'close');
  close.setAttribute('aria-label','Close comparison');
  const content=element('div',null,'detail-copy');
  const heading=element('h2','Compare your shortlist');
  heading.id='compare-title';
  dialog.setAttribute('aria-labelledby',heading.id);
  const table=element('table',null,'compare-table');
  const header=table.createTHead().insertRow();
  for(const text of ['Home',...homes.map(home=>home.title)]){
    const cell=element('th',text);
    cell.scope='col';
    header.append(cell);
  }
  const rows=[
    ['Category',home=>labels[home.category]],
    ['Neighbourhood',home=>home.area+' · '+home.city],
    ['Price',price],
    ['Apartment size',home=>home.size.toLocaleString()+' sq ft'],
    ['Bedrooms',home=>String(home.bedrooms)],
    ['Amenities',home=>home.amenities.join(', ')],
    ['Estimated move-in',home=>home.category==='Flatmates'?money(home.price+home.deposit+home.bills,home.city):'See listing'],
    ['Household fit',home=>home.category==='Flatmates'?fit(home).length+' of '+habits.length+' habits align':'Whole home']
  ];
  const body=table.createTBody();
  for(const [label,value] of rows){
    const row=body.insertRow();
    const cell=element('th',label);
    cell.scope='row';
    row.append(cell);
    for(const home of homes) row.insertCell().textContent=value(home);
  }
  const scroll=element('div',null,'compare-scroll');
  scroll.tabIndex=0;
  scroll.setAttribute('role','region');
  scroll.setAttribute('aria-label','Comparison table');
  scroll.append(table);
  content.append(heading,scroll);
  dialog.append(close,content);
  document.body.append(dialog);
  dialog.addEventListener('close',()=>dialog.remove());
  dialog.showModal();
}
function gallery(home){
  const section=element('div',null,'home-gallery');
  const image=element('img');
  const counter=element('span',null,'gallery-count');
  counter.setAttribute('aria-live','polite');
  let current=0;
  function show(next){
    current=(next+3)%3;
    image.src=photo(home.index+current,1400);
    image.alt='Illustrative apartment interior, view '+(current+1)+' of 3';
    counter.textContent=(current+1)+' / 3 · Illustrative photos';
  }
  const previous=button('‹',()=>show(current-1),'gallery-prev');
  previous.setAttribute('aria-label','Previous apartment photo');
  const next=button('›',()=>show(current+1),'gallery-next');
  next.setAttribute('aria-label','Next apartment photo');
  section.append(image,previous,next,counter);
  show(0);
  return section;
}
function neighbourhood(home){
  const local=getNeighbourhood(home.city,home.area);
  const section=element('section',null,'home-section');
  section.append(element('h3','Around '+home.area));
  if(!local) return section;
  section.append(element('p',local.summary));
  const list=element('ul');
  for(const place of local.places){
    const item=element('li',place.type+' · ');
    item.append(source(place.name,place.url));
    list.append(item);
  }
  section.append(list,source(local.sourceLabel,local.sourceUrl));
  if(local.rentBenchmark){
    const benchmark=local.rentBenchmark;
    const block=element('div',null,'benchmark');
    block.append(element('h4','Registered rents in '+home.area),
      element('strong',money(benchmark.annualMedian,home.city)+' / year median'),
      element('p',benchmark.contracts.toLocaleString()+' registered leases · 12 months through '+benchmark.dataThrough+' · Community-wide data'),
      source(benchmark.sourceLabel,benchmark.sourceUrl),document.createTextNode(' · '),source('CC BY 4.0',benchmark.licenseUrl));
    section.append(block);
  }
  return section;
}
function details(home){
  const person=home.category==='Flatmates';
  const modal=element('dialog',null,'apartment-dialog');
  const close=button('✕',()=>modal.close(),'close');
  close.setAttribute('aria-label','Close details');
  const content=element('div',null,'detail-copy');
  const heading=element('h2',home.title);
  heading.id='apartment-title';
  modal.setAttribute('aria-labelledby',heading.id);
  content.append(element('p',home.area+' · '+home.city+' · Demo '+(person?'room':'listing'),'area'),heading,element('p',price(home),'home-price'));
  const specs=element('div',null,'home-facts');
  for(const fact of [home.bedrooms+' bedrooms',home.baths+' bathrooms',home.size.toLocaleString()+' sq ft',...home.amenities]) specs.append(element('span',fact,'fact'));
  content.append(specs);
  if(person){
    const firstMonth=home.monthly+home.deposit+home.bills;
    const costs=element('section',null,'home-section');
    costs.append(element('h3','Room and move-in costs'),element('p',home.availability+'. Estimated utilities are separate from rent.'));
    const rows=element('dl',null,'cost-rows');
    for(const [label,amount] of [['First month’s rent',home.monthly],['Refundable deposit',home.deposit],['Estimated first month’s utilities',home.bills],['Estimated move-in total',firstMonth]]) {
      rows.append(element('dt',label),element('dd',money(amount,home.city)));
    }
    costs.append(rows);
    const household=element('section',null,'home-section');
    household.append(element('h3','Share with '+home.host),element('p',home.rules));
    for(const [i,[label]] of habits.entries()){
      household.append(element('p',label+' · '+home.habits[i]+(fit(home).includes(home.habits[i])?' · Matches your preference':'')));
    }
    content.append(costs,household);
  }
  content.append(neighbourhood(home));
  const assistant=element('div');
  content.append(assistant);
  mountHousingAssistant(assistant,{
    locations,context:{city:home.city,category:home.category},
    listing:{...home,price:price(home),deposit:person?money(home.deposit,home.city):null,bills:person?money(home.bills,home.city)+' per month':null,commute:getNeighbourhood(home.city,home.area)?.summary}
  });
  const actions=element('div',null,'apartment-actions');
  actions.append(button(person?'Connect with '+home.host:'Enquire about this home',()=>{
    modal.close();
    startRequest(home.title+' · '+home.area,person?'flatmate':'property',{
      id:home.id,receiver:home.receiver,
      message:person?'Hi '+home.host+', I’m interested in the room in '+home.area+'. Could we talk about move-in dates and arrange a viewing?':undefined
    });
  }));
  modal.append(gallery(home),close,content,actions);
  document.body.append(modal);
  modal.addEventListener('close',()=>modal.remove());
  modal.showModal();
}

document.querySelector('header').innerHTML='<a class="brand" href="./">◒ WiseLabs <small>Living</small></a><span class="demo-label">Interactive demo</span>';
render();
