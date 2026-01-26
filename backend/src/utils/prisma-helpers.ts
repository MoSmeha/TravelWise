import { PriceLevel } from '../generated/prisma/client.js';

export function mapGooglePriceLevel(priceLevel: number | string | null | undefined): PriceLevel | null {
  if (priceLevel === null || priceLevel === undefined) return null;
  
  const level = typeof priceLevel === 'string' ? parseInt(priceLevel, 10) : priceLevel;
  
  if (isNaN(level)) return null;
  
  if (level <= 1) return PriceLevel.INEXPENSIVE;
  if (level === 2) return PriceLevel.MODERATE;
  return PriceLevel.EXPENSIVE;
}

export function mapStringPriceLevel(priceLevel: string | null | undefined): PriceLevel | null {
  if (!priceLevel) return null;
  
  const normalized = priceLevel.toUpperCase();
  
  if (normalized === 'INEXPENSIVE') return PriceLevel.INEXPENSIVE;
  if (normalized === 'MODERATE') return PriceLevel.MODERATE;
  if (normalized === 'EXPENSIVE') return PriceLevel.EXPENSIVE;
  
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

export function mapPriceLevel(priceLevel: number | string | null | undefined): PriceLevel | null {
  if (priceLevel === null || priceLevel === undefined) return null;
  
  if (typeof priceLevel === 'number') {
    return mapGooglePriceLevel(priceLevel);
  }
  
  const parsed = parseInt(priceLevel, 10);
  if (!isNaN(parsed)) {
    return mapGooglePriceLevel(parsed);
  }
  
  return mapStringPriceLevel(priceLevel);
}
