/**
 * Prisma Helper Utilities
 * Shared helpers for Prisma-related operations
 */

import { PriceLevel } from '@prisma/client';

/**
 * Maps Google Places API price_level (integer 0-4) to PriceLevel enum
 * Google uses: 0 (Free), 1 (Inexpensive), 2 (Moderate), 3 (Expensive), 4 (Very Expensive)
 * We map to: INEXPENSIVE (0-1), MODERATE (2), EXPENSIVE (3-4)
 */
export function mapGooglePriceLevel(priceLevel: number | string | null | undefined): PriceLevel | null {
  if (priceLevel === null || priceLevel === undefined) return null;
  
  const level = typeof priceLevel === 'string' ? parseInt(priceLevel, 10) : priceLevel;
  
  if (isNaN(level)) return null;
  
  if (level <= 1) return PriceLevel.INEXPENSIVE;
  if (level === 2) return PriceLevel.MODERATE;
  return PriceLevel.EXPENSIVE; // 3 or 4
}

/**
 * Maps string price level representations to PriceLevel enum
 * Handles legacy string formats from seed data
 */
export function mapStringPriceLevel(priceLevel: string | null | undefined): PriceLevel | null {
  if (!priceLevel) return null;
  
  const normalized = priceLevel.toUpperCase();
  
  // Handle Prisma enum names directly
  if (normalized === 'INEXPENSIVE') return PriceLevel.INEXPENSIVE;
  if (normalized === 'MODERATE') return PriceLevel.MODERATE;
  if (normalized === 'EXPENSIVE') return PriceLevel.EXPENSIVE;
  
  // Handle Google Places API style strings
  if (normalized.includes('INEXPENSIVE') || normalized === 'PRICE_LEVEL_INEXPENSIVE') {
    return PriceLevel.INEXPENSIVE;
  }
  if (normalized.includes('MODERATE') || normalized === 'PRICE_LEVEL_MODERATE') {
    return PriceLevel.MODERATE;
  }
  if (normalized.includes('EXPENSIVE') || normalized === 'PRICE_LEVEL_EXPENSIVE' || normalized === 'PRICE_LEVEL_VERY_EXPENSIVE') {
    return PriceLevel.EXPENSIVE;
  }
  
  return null;
}

/**
 * Universal price level mapper - handles both integer and string inputs
 */
export function mapPriceLevel(priceLevel: number | string | null | undefined): PriceLevel | null {
  if (priceLevel === null || priceLevel === undefined) return null;
  
  if (typeof priceLevel === 'number') {
    return mapGooglePriceLevel(priceLevel);
  }
  
  // Try parsing as integer first
  const parsed = parseInt(priceLevel, 10);
  if (!isNaN(parsed)) {
    return mapGooglePriceLevel(parsed);
  }
  
  // Fall back to string mapping
  return mapStringPriceLevel(priceLevel);
}
