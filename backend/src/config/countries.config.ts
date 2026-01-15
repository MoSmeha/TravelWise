// Countries configuration with predefined airports and minimum budgets
// This is the ONLY source of truth for supported countries - no mock data

export interface Airport {
  name: string;
  code: string;
  latitude: number;
  longitude: number;
}

export interface CountryConfig {
  key: string;  // Unique key for API calls
  name: string;
  code: string;
  currency: string;
  minBudgetPerDay: number;
  airports: Airport[];
  regions: string[];  // Major regions/areas to explore
}

export const COUNTRIES: Record<string, CountryConfig> = {
  lebanon: {
    key: 'lebanon',
    name: 'Lebanon',
    code: 'LB',
    currency: 'USD',
    minBudgetPerDay: 50,
    airports: [
      { name: 'Beirut–Rafic Hariri International Airport', code: 'BEY', latitude: 33.8208, longitude: 35.4883 },
    ],
    regions: ['Beirut', 'Baalbek', 'Byblos', 'Tripoli', 'Sidon', 'Tyre', 'Beiteddine', 'Cedars', 'Batroun', 'Jounieh'],
  },
  italy: {
    key: 'italy',
    name: 'Italy',
    code: 'IT',
    currency: 'EUR',
    minBudgetPerDay: 80,
    airports: [
      { name: 'Rome Fiumicino Airport', code: 'FCO', latitude: 41.8003, longitude: 12.2389 },
      { name: 'Milan Malpensa Airport', code: 'MXP', latitude: 45.6306, longitude: 8.7281 },
      { name: 'Venice Marco Polo Airport', code: 'VCE', latitude: 45.5053, longitude: 12.3519 },
      { name: 'Naples International Airport', code: 'NAP', latitude: 40.8860, longitude: 14.2908 },
    ],
    regions: ['Rome', 'Florence', 'Venice', 'Milan', 'Naples', 'Amalfi Coast', 'Tuscany', 'Sicily', 'Cinque Terre', 'Lake Como', 'Puglia', 'Bologna'],
  },
  turkey: {
    key: 'turkey',
    name: 'Turkey',
    code: 'TR',
    currency: 'TRY',
    minBudgetPerDay: 40,
    airports: [
      { name: 'Istanbul Airport', code: 'IST', latitude: 41.2608, longitude: 28.7418 },
      { name: 'Istanbul Sabiha Gökçen Airport', code: 'SAW', latitude: 40.8986, longitude: 29.3092 },
      { name: 'Antalya Airport', code: 'AYT', latitude: 36.8987, longitude: 30.8006 },
      { name: 'Bodrum Milas Airport', code: 'BJV', latitude: 37.2506, longitude: 27.6644 },
    ],
    regions: ['Istanbul', 'Cappadocia', 'Antalya', 'Bodrum', 'Ephesus', 'Pamukkale', 'Fethiye', 'Izmir', 'Trabzon', 'Mardin'],
  },
  thailand: {
    key: 'thailand',
    name: 'Thailand',
    code: 'TH',
    currency: 'THB',
    minBudgetPerDay: 35,
    airports: [
      { name: 'Suvarnabhumi Airport (Bangkok)', code: 'BKK', latitude: 13.6900, longitude: 100.7501 },
      { name: 'Don Mueang Airport (Bangkok)', code: 'DMK', latitude: 13.9126, longitude: 100.6068 },
      { name: 'Phuket International Airport', code: 'HKT', latitude: 8.1132, longitude: 98.3169 },
      { name: 'Chiang Mai International Airport', code: 'CNX', latitude: 18.7668, longitude: 98.9625 },
    ],
    regions: ['Bangkok', 'Chiang Mai', 'Phuket', 'Krabi', 'Koh Samui', 'Pattaya', 'Ayutthaya', 'Pai', 'Kanchanaburi', 'Chiang Rai'],
  },
  uae: {
    key: 'uae',
    name: 'United Arab Emirates',
    code: 'AE',
    currency: 'AED',
    minBudgetPerDay: 100,
    airports: [
      { name: 'Dubai International Airport', code: 'DXB', latitude: 25.2532, longitude: 55.3657 },
      { name: 'Abu Dhabi International Airport', code: 'AUH', latitude: 24.4330, longitude: 54.6511 },
      { name: 'Sharjah International Airport', code: 'SHJ', latitude: 25.3286, longitude: 55.5172 },
    ],
    regions: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ras Al Khaimah', 'Fujairah', 'Al Ain', 'Ajman'],
  },
  bali: {
    key: 'bali',
    name: 'Bali, Indonesia',
    code: 'ID',
    currency: 'IDR',
    minBudgetPerDay: 40,
    airports: [
      { name: 'Ngurah Rai International Airport (Bali)', code: 'DPS', latitude: -8.7482, longitude: 115.1672 },
    ],
    regions: ['Ubud', 'Seminyak', 'Canggu', 'Kuta', 'Uluwatu', 'Nusa Dua', 'Sanur', 'Amed', 'Lovina', 'Nusa Penida'],
  },
  france: {
    key: 'france',
    name: 'France',
    code: 'FR',
    currency: 'EUR',
    minBudgetPerDay: 90,
    airports: [
      { name: 'Paris Charles de Gaulle Airport', code: 'CDG', latitude: 49.0097, longitude: 2.5479 },
      { name: 'Paris Orly Airport', code: 'ORY', latitude: 48.7262, longitude: 2.3652 },
      { name: 'Nice Côte d\'Azur Airport', code: 'NCE', latitude: 43.6584, longitude: 7.2159 },
      { name: 'Lyon–Saint-Exupéry Airport', code: 'LYS', latitude: 45.7256, longitude: 5.0811 },
    ],
    regions: ['Paris', 'Nice', 'Lyon', 'Marseille', 'Bordeaux', 'Provence', 'Loire Valley', 'Normandy', 'Alsace', 'French Riviera'],
  },
};

// Helper function to get all countries as array
export function getCountriesList(): CountryConfig[] {
  return Object.values(COUNTRIES);
}

// Helper function to find country by key (now checks explicit key field)
export function getCountryByKey(key: string): CountryConfig | undefined {
  const normalizedKey = key.toLowerCase().trim();
  // Direct lookup first
  if (COUNTRIES[normalizedKey]) {
    return COUNTRIES[normalizedKey];
  }
  // Then search by key field
  return Object.values(COUNTRIES).find(c => c.key === normalizedKey);
}

// Helper function to find airport by code within a country
export function getAirportByCode(countryKey: string, airportCode: string): Airport | undefined {
  const country = getCountryByKey(countryKey);
  if (!country) return undefined;
  return country.airports.find(a => a.code === airportCode);
}

// Validate budget meets minimum for country
export function validateBudget(countryKey: string, budgetUSD: number, numberOfDays: number): { valid: boolean; minRequired: number } {
  const country = getCountryByKey(countryKey);
  if (!country) return { valid: false, minRequired: 0 };
  
  const minRequired = country.minBudgetPerDay * numberOfDays;
  return { valid: budgetUSD >= minRequired, minRequired };
}

// Get combined country and airport config (useful for response building)
export function getAirportConfig(country: string, airportCode: string): {
  countryConfig: CountryConfig | undefined;
  airportConfig: Airport | undefined;
} {
  const countryConfig = getCountryByKey(country);
  const airportConfig = countryConfig?.airports.find(a => a.code === airportCode) 
    || countryConfig?.airports[0];
  return { countryConfig, airportConfig };
}
