const metroData = 'https://data.opencity.in/dataset/bengaluru-metro-stations';
const dubaiTransit = 'https://www.rta.ae/wps/portal/rta/ae/public-transport/metro-stations-map';
const dubaiRentSource = 'https://github.com/datadubai/dubai-real-estate-dld#license-and-attribution';
const dubaiRentLicense = 'https://creativecommons.org/licenses/by/4.0/';

function registeredRent(annualMedian, contracts, community) {
  return {
    annualMedian,
    contracts,
    currency: 'AED',
    dataThrough: '2026-10-29',
    period: '12-month registered lease snapshot',
    sourceLabel: 'Dubai Data, Continental Club Property, based on Dubai Land Department open data',
    sourceUrl: dubaiRentSource,
    detailUrl: 'https://datadubai.ae/communities/' + community + '/',
    licenseUrl: dubaiRentLicense
  };
}

const neighbourhoods = {
  Bengaluru: {
    Indiranagar: {
      summary: 'Indiranagar has a Namma Metro Purple Line stop. Check the route from the actual building before planning your commute.',
      sourceLabel: 'OpenCity metro dataset (OpenStreetMap contributors)',
      sourceUrl: metroData,
      places: [
        { name: 'Indiranagar metro', type: 'Purple Line', url: metroData }
      ]
    },
    'HSR Layout': {
      summary: 'HSR Layout borders Agara Lake near Outer Ring Road and Sarjapur Main Road. The layout spans several sectors, so check which sector the home is in.',
      sourceLabel: 'BBMP ward map via OpenCity',
      sourceUrl: 'https://staging.opencity.in/dataset/81b78513-33ed-48fb-9af3-f33ae3575892/resource/77571c4f-cd91-4197-a883-c1c065a646c4/download/bc9a9494-6f95-4695-bcda-4bafa9eef604.pdf',
      places: [
        { name: 'Agara Lake Park', type: 'Park', url: 'https://www.openstreetmap.org/way/610111576' }
      ]
    },
    Whitefield: {
      summary: 'Whitefield includes International Tech Park Bangalore and has Purple Line service to Whitefield (Kadugodi).',
      sourceLabel: 'OpenCity metro dataset (OpenStreetMap contributors)',
      sourceUrl: metroData,
      places: [
        { name: 'Whitefield (Kadugodi) metro', type: 'Purple Line', url: 'https://www.pib.gov.in/PressReleasePage.aspx?PRID=1910674&lang=2&reg=3' },
        { name: 'International Tech Park Bangalore', type: 'Employment centre', url: 'https://www.capitaland.com/en/find-a-property/global-property-listing/businesspark-industrial-logistics/international-techparkbangalore.html' }
      ]
    }
  },
  Dubai: {
    'Dubai Marina': {
      summary: 'A waterfront neighbourhood with a marina promenade and tram service. Jumeirah Beach Residence is next door.',
      sourceLabel: 'Visit Dubai neighbourhood guide',
      sourceUrl: 'https://www.visitdubai.com/en/explore-dubai/dubai-neighbourhoods/dubai-marina',
      places: [
        { name: 'Dubai Marina tram', type: 'Tram', url: dubaiTransit },
        { name: 'Dubai Marina Mall', type: 'Shopping', url: 'https://www.dubaimarinamall.com/' }
      ],
      rentBenchmark: registeredRent(110000, 13961, 'dubai-marina')
    },
    'Business Bay': {
      summary: 'High-rise district next to Downtown Dubai, with the Dubai Water Canal and a Red Line metro station.',
      sourceLabel: 'Visit Dubai neighbourhood guide',
      sourceUrl: 'https://www.visitdubai.com/en/explore-dubai/dubai-neighbourhoods/business-bay',
      places: [
        { name: 'Business Bay metro', type: 'Red Line', url: dubaiTransit }
      ],
      rentBenchmark: registeredRent(89250, 15023, 'business-bay')
    },
    'Jumeirah Lakes Towers': {
      summary: 'Residential and office towers organised into lettered clusters around lakes and a park. Check the cluster when arranging a viewing.',
      sourceLabel: 'Visit Dubai neighbourhood guide',
      sourceUrl: 'https://www.visitdubai.com/en/explore-dubai/dubai-neighbourhoods/jumeirah-lakes-towers',
      places: [
        { name: 'DMCC metro', type: 'Red Line', url: dubaiTransit },
        { name: 'Jumeirah Lakes Towers tram', type: 'Tram', url: dubaiTransit }
      ],
      rentBenchmark: registeredRent(88000, 2345, 'jumeirah-lakes-towers')
    }
  }
};

export function getNeighbourhood(city, area) {
  if (!Object.hasOwn(neighbourhoods, city) || !Object.hasOwn(neighbourhoods[city], area)) return null;
  return neighbourhoods[city][area];
}
