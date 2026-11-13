export const markets = {
  India: {
    cities: {Bengaluru:['HSR Layout','Koramangala','Whitefield','Bellandur'], Mumbai:['Powai','Bandra'], Pune:['Kharadi','Hinjawadi'], Hyderabad:['Gachibowli','Kondapur']},
    location: 'Locality, society or landmark',
    pricing: 'INR · Monthly rent'
  },
  Dubai: {
    cities: {Dubai:['Business Bay','Dubai Marina','Jumeirah Lakes Towers','Al Barsha']},
    location: 'Community, building or tower',
    pricing: 'AED · Rooms typically shown monthly, whole homes often annually'
  }
};

export const intents = ['Rent a home','Buy a home','Find flatmates','Find a short stay'];

export function localityMatches(city, query) {
  const areas = Object.values(markets).find(market => Object.hasOwn(market.cities,city))?.cities[city] ?? [];
  const search = query.trim().toLowerCase();
  return areas.filter(area => area.toLowerCase().includes(search));
}
