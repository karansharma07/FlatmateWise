export const markets = {
  Bengaluru: [
    {area:'Indiranagar', host:'Ananya', receiver:'host', room:'Private room in a furnished 3 BHK', monthly:14000, deposit:42000, bills:1500, bedrooms:3, baths:2, size:1450, amenities:['furnished','balcony','metro','private bathroom'], availability:'Available in the demo now', rules:'Quiet after 11 pm. No smoking indoors. Discuss overnight guests in advance.', habits:['Early mornings','Daily reset','Quiet evenings']},
    {area:'HSR Layout', host:'Dev', receiver:'dev', room:'Sunny room in a shared 2 BHK', monthly:12000, deposit:36000, bills:1300, bedrooms:2, baths:2, size:1100, amenities:['parking','pet-friendly','private bathroom'], availability:'Flexible move-in in the demo', rules:'One cat lives here. Friends are welcome with a heads-up.', habits:['Late nights','Weekly clean','Friends welcome']},
    {area:'Whitefield', host:'Jamie', receiver:'jamie', room:'Furnished room with a balcony', monthly:19300, deposit:58000, bills:1900, bedrooms:3, baths:2, size:1600, amenities:['furnished','balcony','parking','metro'], availability:'Flexible move-in in the demo', rules:'Shared bathroom. Quiet weeknights and a weekly cleaning rota.', habits:['Early mornings','Weekly clean','Quiet evenings']}
  ],
  Dubai: [
    {area:'Dubai Marina', host:'Ananya', receiver:'host', room:'Furnished room in a waterfront apartment', monthly:3500, deposit:3500, bills:400, bedrooms:3, baths:2, size:1430, amenities:['furnished','balcony','metro','private bathroom'], availability:'Available in the demo now', rules:'Quiet after 11 pm. Discuss guests in advance.', habits:['Early mornings','Daily reset','Quiet evenings']},
    {area:'Business Bay', host:'Dev', receiver:'dev', room:'Private room in a two-bedroom apartment', monthly:3100, deposit:3100, bills:350, bedrooms:2, baths:2, size:1060, amenities:['parking','private bathroom'], availability:'Flexible move-in in the demo', rules:'Smoke-free home. Friends welcome with a heads-up.', habits:['Late nights','Weekly clean','Friends welcome']},
    {area:'Jumeirah Lakes Towers', host:'Jamie', receiver:'jamie', room:'Furnished room near the lakes', monthly:3900, deposit:3900, bills:450, bedrooms:3, baths:2, size:1570, amenities:['furnished','balcony','parking','metro'], availability:'Flexible move-in in the demo', rules:'Shared bathroom and quiet weeknights.', habits:['Early mornings','Weekly clean','Quiet evenings']}
  ]
};

const photos = [
  'photo-1600210492486-724fe5c67fb0',
  'photo-1616594039964-ae9021a400a0',
  'photo-1600607687920-4e2a09cf159d',
  'photo-1600566753086-00f18fb6b3ea'
];

export function photo(index, width=1200) {
  return 'https://images.unsplash.com/'+photos[index%photos.length]+'?auto=format&fit=crop&w='+width+'&q=82';
}

export function money(value, city) {
  return new Intl.NumberFormat(city==='Dubai'?'en-AE':'en-IN',{
    style:'currency',currency:city==='Dubai'?'AED':'INR',maximumFractionDigits:0
  }).format(value);
}

export function inventory(city, category) {
  return markets[city].map((room,index)=>{
    const id=city+'/'+category+'/'+room.area;
    if(category==='Flatmates') return {...room, city, category, id, index, title:room.room, price:room.monthly, period:'/ month'};
    const prices = {
      Buy:city==='Dubai'?[1850000,1400000,2100000]:[14500000,11900000,16500000],
      Rent:city==='Dubai'?[102000,86400,117600]:[42000,36000,58000],
      'Short stays':city==='Dubai'?[450,385,510]:[3500,2800,3900]
    };
    const title=['Light-filled apartment','A quiet corner of the city','Apartment with an open living area'][index];
    const period=category==='Buy'?'':category==='Short stays'?'/ night':city==='Dubai'?'/ year':'/ month';
    return {...room,city,category,id,index,title,price:prices[category][index],period};
  });
}
