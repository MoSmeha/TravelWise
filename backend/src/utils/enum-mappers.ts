/**
 * Enum mapping utilities
 * Convert string values to type-safe enums
 */

// TypeScript enums (not from Prisma as no model uses them)
export enum BudgetLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum TravelStyle {
  NATURE = 'NATURE',
  FOOD = 'FOOD',
  CULTURE = 'CULTURE',
  NIGHTLIFE = 'NIGHTLIFE',
  MIXED = 'MIXED',
}

/**
 * Map budget level string to enum
 */
export function parseBudgetLevel(value: string | undefined): BudgetLevel {
  const map: Record<string, BudgetLevel> = {
    'LOW': BudgetLevel.LOW,
    'MEDIUM': BudgetLevel.MEDIUM,
    'HIGH': BudgetLevel.HIGH,
  };
  return map[value || 'MEDIUM'] || BudgetLevel.MEDIUM;
}

/**
 * Map travel style string to enum
 */
export function parseTravelStyle(value: string | undefined): TravelStyle {
  const map: Record<string, TravelStyle> = {
    'NATURE': TravelStyle.NATURE,
    'FOOD': TravelStyle.FOOD,
    'CULTURE': TravelStyle.CULTURE,
    'NIGHTLIFE': TravelStyle.NIGHTLIFE,
    'MIXED': TravelStyle.MIXED,
  };
  return map[value || 'MIXED'] || TravelStyle.MIXED;
}

/**
 * List of known Lebanese cities for address parsing
 */
export const LEBANON_CITIES = [
  'Beirut', 'Byblos', 'Jbeil', 'Batroun', 'Jounieh',
  'Sidon', 'Saida', 'Tyre', 'Sour', 'Tripoli', 'Baalbek', 'Zahle'
];

/**
 * Extract city name from a formatted address
 */
export function extractCityFromAddress(address: string): string {
  const addressLower = address.toLowerCase();
  
  for (const city of LEBANON_CITIES) {
    if (addressLower.includes(city.toLowerCase())) {
      return city;
    }
  }
  
  if (addressLower.includes('lebanon')) {
    return 'Lebanon';
  }
  
  return 'Unknown';
}
