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
  ADVENTURE = 'ADVENTURE',           // hiking, trekking, diving, safaris, extreme sports
  CULTURAL = 'CULTURAL',             // museums, UNESCO sites, local traditions, food tours
  NATURE_ECO = 'NATURE_ECO',         // national parks, wildlife viewing, sustainable trips
  BEACH_RELAXATION = 'BEACH_RELAXATION', // resorts, islands, spas, tropical getaways
  URBAN_CITY = 'URBAN_CITY',         // architecture, nightlife, shopping, entertainment
  FAMILY_GROUP = 'FAMILY_GROUP',     // multi-generational trips, theme parks, easy hotels
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
    'ADVENTURE': TravelStyle.ADVENTURE,
    'CULTURAL': TravelStyle.CULTURAL,
    'NATURE_ECO': TravelStyle.NATURE_ECO,
    'BEACH_RELAXATION': TravelStyle.BEACH_RELAXATION,
    'URBAN_CITY': TravelStyle.URBAN_CITY,
    'FAMILY_GROUP': TravelStyle.FAMILY_GROUP,
  };
  return map[value || 'CULTURAL'] || TravelStyle.CULTURAL;
}

/**
 * Parse array of travel styles (max 3)
 */
export function parseTravelStyles(values: string[] | undefined): TravelStyle[] {
  if (!values || values.length === 0) {
    return [TravelStyle.CULTURAL];
  }
  return values.slice(0, 3).map(v => parseTravelStyle(v));
}

import { PriceLevel } from '../generated/prisma/client.js';

/**
 * Map BudgetLevel to PriceLevel for database filtering
 */
export function mapBudgetToPriceLevel(budget: BudgetLevel): PriceLevel | undefined {
  switch (budget) {
    case BudgetLevel.LOW: return PriceLevel.INEXPENSIVE;
    case BudgetLevel.MEDIUM: return PriceLevel.MODERATE;
    case BudgetLevel.HIGH: return PriceLevel.EXPENSIVE;
    default: return undefined;
  }
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
