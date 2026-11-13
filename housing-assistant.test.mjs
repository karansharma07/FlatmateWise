import {test} from 'node:test';
import assert from 'node:assert/strict';
import {answerHousingQuestion, parseHousingQuery} from './public/housing-assistant.js';

const locations = {Bengaluru:['Indiranagar','HSR Layout'], Dubai:['Dubai Marina','Jumeirah Lakes Towers']};
const context = {city:'Bengaluru',category:'Flatmates'};

test('reads local budget units, neighbourhood aliases and apartment requirements',()=>{
  const room = parseHousingQuery('Private room in HSR under ₹20k with parking and ensuite',locations,context);
  assert.deepEqual(room.filters,{
    city:'Bengaluru',category:'Flatmates',area:'HSR Layout',maxPrice:20000,bedrooms:null,pricePeriod:null,
    amenities:['parking','private bathroom']
  });
  const purchase = parseHousingQuery('Buy a 3 BHK in Bangalore up to 1.2 crore',locations,context);
  assert.equal(purchase.filters.maxPrice,12000000);
  assert.equal(purchase.filters.bedrooms,3);
  assert.equal(purchase.filters.category,'Buy');
  const rental = parseHousingQuery('AED 95k per year for a 2-bedroom rental in JLT',locations,context);
  assert.equal(rental.filters.city,'Dubai');
  assert.equal(rental.filters.area,'Jumeirah Lakes Towers');
  assert.equal(rental.filters.pricePeriod,'year');
  assert.equal(rental.filters.maxPrice,95000);
});

test('keeps commute times and excluded amenities out of the applied search',()=>{
  const result = parseHousingQuery('Rent in Indiranagar within 30 minutes of work, without parking',locations,context);
  assert.equal(result.filters.maxPrice,null);
  assert.deepEqual(result.filters.amenities,[]);
  assert.deepEqual(result.unsupported,['travel time or distance','excluded features']);
  assert.equal(parseHousingQuery('Rent in Bengaluru under AED 1k',locations,context).canSearch,false);
});

test('listing questions use provided facts and show follow-up questions for unknowns',()=>{
  const results = answerHousingQuestion('What is the deposit and what bills are included?',{deposit:'₹28,000'});
  assert.equal(results[0],'Deposit · ₹28,000');
  assert.match(results[1],/^Ask at the viewing/);
  assert.equal(answerHousingQuestion('Where is the apartment?',{area:'Indiranagar'})[0],'Neighbourhood · Indiranagar');
  assert.equal(answerHousingQuestion('Viewing checklist').length,3);
});
