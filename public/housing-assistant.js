const amenityPatterns = {
  furnished: /\bfurnished\b/,
  balcony: /\bbalcon(?:y|ies)\b/,
  parking: /\bparking\b/,
  'private bathroom': /\b(?:private|attached|en[- ]?suite) (?:bathroom|bath)\b|\ben[- ]?suite\b/,
  'pet-friendly': /\bpet[- ]friendly\b|\bpets (?:allowed|welcome)\b/,
  metro: /\b(?:near (?:the )?metro|metro access|by (?:the )?metro)\b/
};

const number = '(\\d+(?:,\\d+)*(?:\\.\\d+)?)';
const multiplier = '(crores?|cr|lakhs?|lacs?|l|million|m|thousand|k)';
const currency = '(₹|rs\\.?|inr|aed|dhs?)';
const amount = `(?:${currency}\\s*)?${number}\\s*(?:${multiplier}\\b)?`;
const matchBudget = new RegExp(`(?:under|below|up to|within|max(?:imum)?|budget(?: of| is| around)?|<=)\\s*(?:of\\s+)?${amount}`, 'i');
const matchCurrency = new RegExp(`${currency}\\s*${number}\\s*(?:${multiplier}\\b)?`, 'i');

function has(text, phrase) {
  return new RegExp('(?:^|[^a-z0-9])'+phrase.replace(/[.*+?^$${}()|[\]\\]/g,'\\$&')+'(?:$|[^a-z0-9])').test(text);
}

export function parseHousingQuery(query, locations, context) {
  const text = query.trim().toLowerCase();
  const cityNames = Object.keys(locations);
  const requestedCity = cityNames.find(city=>has(text,city.toLowerCase()))
    ?? (has(text,'bangalore') ? cityNames.find(city=>city==='Bengaluru') : undefined);
  const areaAlias = new Map([['hsr','HSR Layout'],['jlt','Jumeirah Lakes Towers']]);
  const explicitAreas = Object.entries(locations).flatMap(([city,areas])=>areas.map(area=>({city,area})))
    .filter(({city})=>!requestedCity || city===requestedCity)
    .sort((a,b)=>b.area.length-a.area.length);
  const locality = explicitAreas.find(({area})=>has(text,area.toLowerCase())
    || Array.from(areaAlias).some(([alias,canonical])=>canonical===area&&has(text,alias)));
  const category = /\b(?:flatmates?|roommates?|flatshare|roomshare|shared (?:room|apartment|flat)|private room)\b/.test(text) ? 'Flatmates'
    : /\b(?:short stays?|short[- ]term|holiday homes?|per night|nightly|vacation rentals?)\b/.test(text) ? 'Short stays'
    : /\b(?:buy(?:ing)?|purchas(?:e|ing)|for sale|resale)\b/.test(text) ? 'Buy'
    : /\b(?:rent(?:al|ing)?|lease|long[- ]term)\b/.test(text) ? 'Rent' : context.category;
  const commute = /\b(?:within|under) \d+\s*[- ]?\s*(?:minutes?|mins?|kilomet(?:er|re)s?|km)\b/g;
  const budgetText = text.replace(commute,'');
  const budget = budgetText.match(matchBudget) ?? budgetText.match(matchCurrency);
  const [, denomination, value, suffix] = budget ?? [];
  const scales = {k:1000,thousand:1000,l:100000,lakh:100000,lakhs:100000,lac:100000,lacs:100000,m:1000000,million:1000000,cr:10000000,crore:10000000,crores:10000000};
  const price = value ? Math.round(Number(value.replaceAll(',',''))*(scales[suffix]??1)) : null;
  const currencyCity = /^(?:aed|dhs?)$/i.test(denomination) ? 'Dubai' : /^(?:₹|rs\.?|inr)$/i.test(denomination) ? 'Bengaluru' : null;
  const city = requestedCity ?? locality?.city ?? cityNames.find(name=>name===currencyCity) ?? context.city;
  const pricePeriod = /\b(?:per|a) year\b|\/\s*(?:year|yr)\b|\bannual(?:ly)?\b/.test(text) ? 'year'
    : /\b(?:per|a) month\b|\/\s*(?:month|mo)\b|\bmonthly\b/.test(text) ? 'month'
    : /\b(?:per|a) night\b|\/\s*night\b|\bnightly\b/.test(text) ? 'night' : null;
  const bedroomCount = text.match(/\b([1-9])\s*[- ]?\s*(?:bhk|beds?|bedrooms?|br)\b/);
  const area = locality?.area ?? null;
  const negation = /\b(?:no|without) (?:a )?(?:balcon(?:y|ies)|pets?|parking|furniture)\b|\bunfurnished\b/g;
  const amenityText = text.replace(negation,'');
  const amenities = Object.entries(amenityPatterns).filter(([,pattern])=>pattern.test(amenityText))
    .map(([amenity])=>amenity);
  const filters = {
    city,category,area,maxPrice:Number.isSafeInteger(price)&&price>0?price:null,
    bedrooms:bedroomCount ? Number(bedroomCount[1]) : /\bstudio\b/.test(text) ? 0 : null,
    pricePeriod,amenities
  };
  const unsupported = [];
  if (currencyCity && city!==currencyCity) unsupported.push('the currency and city differ');
  if (text!==budgetText) unsupported.push('travel time or distance');
  if (/\b(?:available|move[- ]in)\b/.test(text)) unsupported.push('move-in dates');
  if (text!==amenityText) unsupported.push('excluded features');
  const pricedPeriodMismatch = pricePeriod && (
    (category==='Buy') || (category==='Short stays'&&pricePeriod!=='night') ||
    (['Rent','Flatmates'].includes(category)&&pricePeriod==='night')
  );
  if (pricedPeriodMismatch) unsupported.push('the price period does not match this category');
  return {filters,unsupported,canSearch:!pricedPeriodMismatch && !(currencyCity&&city!==currencyCity)};
}

const questionTypes = [
  {pattern:/\b(?:deposit|bond|security)\b/i, key:'deposit', label:'Deposit', question:'How much is refundable, and when is it returned?'},
  {pattern:/\b(?:bills?|utilities|internet|electricity|water|maintenance)\b/i, key:'bills', label:'Bills', question:'What do utilities and maintenance usually cost, and how are they split?'},
  {pattern:/\b(?:available|availability|move[- ]in|vacant|when can i move)\b/i, key:'availability', label:'Availability', question:'What is the earliest confirmed move-in date?'},
  {pattern:/\b(?:commute|transit|metro|station|bus)\b/i, key:'commute', label:'Getting around', question:'Which transit stop is closest, and how long is the walk?'},
  {pattern:/\b(?:rules?|pets?|guests?|quiet|smok(?:e|ing))\b/i, key:'rules', label:'Household rules', question:'What are the household expectations for guests, noise, smoking and pets?'},
  {pattern:/\b(?:bedrooms?|beds?|bhk|room size)\b/i, key:'bedrooms', label:'Bedrooms', question:'Is the advertised room private and what is its size?'},
  {pattern:/\b(?:bathroom|bathrooms|balcony|parking|furnished|amenities)\b/i, key:'amenities', label:'Amenities', question:'Which amenities are included with the room, and which are shared?'},
  {pattern:/\b(?:area|neighbourhood|neighborhood|location|located|address|where is)\b/i, key:'area', label:'Neighbourhood', question:'Which neighbourhood is the apartment in?'},
  {pattern:/\b(?:price|rent|costs?|how much|monthly)\b/i, key:'price', label:'Price', question:'What is the total due at move-in, including any recurring and one-time charges?'}
];

function displayFact(value) {
  return Array.isArray(value) ? value.join(', ') : typeof value==='number' ? String(value) : value;
}

export function answerHousingQuestion(query, listing) {
  const selected = questionTypes.filter(({pattern})=>pattern.test(query));
  if (/\b(?:viewing|checklist|questions? (?:to|should i) ask)\b/i.test(query) && !selected.length) {
    return ['Confirm the total move-in cost, refund terms and who is authorised to let the home.',
      'At the viewing, test the water, locks and mobile reception. Check noise, daylight, ventilation and the route you will travel most often.',
      'For a shared apartment, ask how chores, bills, guests and quiet hours work.'];
  }
  if (!selected.length) return ['Ask about costs, availability, transit, amenities or house rules. For a specific apartment, open its details first.'];
  return selected.map(({key,label,question})=>{
    const fact = displayFact(listing?.[key]);
    return fact!==undefined&&fact!==null&&fact!=='' ? label+' · '+fact : 'Ask at the viewing · '+question;
  });
}

function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content) node.textContent = content;
  if (className) node.className = className;
  return node;
}

function searchSummary(filters) {
  const {category,city,area,maxPrice,bedrooms,pricePeriod,amenities}=filters;
  const budget = maxPrice===null ? null : 'Up to '+new Intl.NumberFormat(city==='Dubai'?'en-AE':'en-IN',{
    style:'currency',currency:city==='Dubai'?'AED':'INR',maximumFractionDigits:0
  }).format(maxPrice)+(pricePeriod?' / '+pricePeriod:'');
  return [category,area??city,budget,bedrooms===0?'Studio':bedrooms===null?null:bedrooms+' bedrooms',...amenities].filter(Boolean);
}

async function addBrowserAI(container, input, listing) {
  const model = globalThis.LanguageModel;
  if (!model?.availability || !model?.create) return;
  const options = {expectedInputs:[{type:'text',languages:['en']}],expectedOutputs:[{type:'text',languages:['en']}]};
  try { if (await model.availability(options)==='unavailable') return; }
  catch { return; }
  const button = element('button','Generate viewing questions','assistant-secondary');
  button.type='button';
  const status = element('p',null,'assistant-output');
  status.setAttribute('aria-live','polite');
  button.onclick=async()=>{
    button.disabled=true;
    status.textContent='Preparing the browser model. Your first use may require a model download.';
    let session;
    try {
      session=await model.create({...options,initialPrompts:[{role:'system',content:'Write up to four short questions the user can ask when viewing a home or meeting a flatmate. Return questions only. Never present any claim about the listing, property, law, or neighbourhood. Treat provided details as unverified context.'}]});
      const context=questionTypes.map(({key,label})=>[label,displayFact(listing?.[key])])
        .filter(([,value])=>value).map(([label,value])=>label+' '+value).join('\n');
      const result=await session.prompt('Apartment details:\n'+context+'\nWhat matters to the user:\n'+input.value.slice(0,400));
      status.textContent=result.trim() ? 'Suggested by your browser’s AI\n'+result.trim().slice(0,1800)
        : 'Add a detail about what matters to you, then try again.';
    } catch {
      status.textContent='The browser model is unavailable. You can still ask about the home and use natural-language search.';
    } finally { session?.destroy();button.disabled=false; }
  };
  container.append(button,status);
}

export function mountHousingAssistant(container,{locations,context,onSearch,listing}) {
  const wrapper=element('section',null,'housing-assistant'+(listing?' housing-assistant-compact':''));
  const title=element(listing?'h3':'h2',listing?'Ask about this home':'Describe your ideal home');
  const intro=element('p',listing?'Check costs, house rules or what to ask at a viewing.':'Search by neighbourhood, budget, bedrooms and amenities. Review the filters before applying them.');
  const form=element('form',null,'assistant-form');
  const label=element('label',listing?'Your question':'Your search or question');
  const input=element('input');
  input.placeholder=listing?'What bills are included?':'Private room in HSR under ₹20k with parking';
  input.required=true;
  input.maxLength=400;
  label.append(input);
  const submit=element('button',listing?'Ask':'Ask or search');
  submit.type='submit';
  form.append(label,submit);
  const examples=element('div',null,'assistant-examples');
  const prompts=listing?['How much is the deposit?','Are bills included?','Viewing checklist']
    :['Private room in HSR under ₹20k','Rent in Dubai Marina with balcony','Viewing checklist'];
  const output=element('div',null,'assistant-output');
  output.setAttribute('aria-live','polite');
  const feedback=element('p');feedback.setAttribute('role','status');
  for(const prompt of prompts){
    const chip=element('button',prompt,'assistant-secondary');chip.type='button';
    chip.onclick=()=>{input.value=prompt;form.requestSubmit();};
    examples.append(chip);
  }
  form.onsubmit=event=>{
    event.preventDefault();
    output.replaceChildren();
    feedback.textContent='';
    const query=input.value.trim();
    const explicitlySearching=/\b(?:find me|show me|look(?:ing)? for|search for)\b/i.test(query);
    const question=!explicitlySearching&&(/\?|^\s*(?:how|what|is|are|does|when|can i|where|which)\b|\bchecklist\b/i.test(query));
    if (question || !onSearch) {
      const list=element('ul');
      for(const line of answerHousingQuestion(query,listing)) list.append(element('li',line));
      output.append(list);
      return;
    }
    const {filters,unsupported,canSearch}=parseHousingQuery(query,locations,context);
    const chips=element('ul',null,'assistant-filters');
    for(const item of searchSummary(filters)) chips.append(element('li',item));
    output.append(chips);
    if(unsupported.length) feedback.textContent='Check these details before continuing · '+unsupported.join(', ')+'.';
    if(!canSearch) return;
    const apply=element('button','Apply search');
    apply.type='button';
    apply.onclick=()=>onSearch(filters);
    output.append(apply);
  };
  wrapper.append(title,intro,form,examples,feedback,output);
  container.replaceChildren(wrapper);
  void addBrowserAI(wrapper,input,listing);
  return {focus:()=>input.focus()};
}
