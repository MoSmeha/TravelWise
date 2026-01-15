/**
 * Response Mappers
 * Reusable functions for mapping domain objects to API response formats
 * Follows DRY principle - used across multiple controllers
 */

import { LocationCategory, LocationClassification } from '@prisma/client';

// ============================================================================
// Place Mappers
// ============================================================================

export interface PlaceLike {
  id: string;
  name: string;
  classification?: LocationClassification | string;
  category: LocationCategory | string;
  description?: string | null;
  latitude: number;
  longitude: number;
  costMinUSD?: number | null;
  costMaxUSD?: number | null;
  rating?: number | null;
  totalRatings?: number | null;
  topReviews?: any;
  imageUrls?: string[];
  imageUrl?: string | null;
  scamWarning?: string | null;
  bestTimeToVisit?: string | null;
  openingHours?: any;
  address?: string | null;
  [key: string]: any;
}

export interface LocationResponse {
  id: string;
  name: string;
  classification: string;
  category: string;
  description: string;
  latitude: number;
  longitude: number;
  costMinUSD: number | null;
  costMaxUSD: number | null;
  rating: number | null;
  totalRatings: number | null;
  topReviews: any;
  imageUrls: string[];
  imageUrl: string | null;
  scamWarning: string | null;
  bestTimeToVisit: string | null;
  crowdLevel: string;
  openingHours: any;
}

export interface MealResponse {
  id: string;
  name: string;
  category: string;
}

export interface HotelResponse {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
}

export interface AirportResponse {
  name: string;
  code: string;
  latitude: number;
  longitude: number;
}

/**
 * Map a place to full location response format
 */
export function mapPlaceToLocation(place: PlaceLike, notes?: string | null): LocationResponse {
  return {
    id: place.id,
    name: place.name,
    classification: String(place.classification || 'CONDITIONAL'),
    category: String(place.category),
    description: place.description || notes || '',
    latitude: place.latitude,
    longitude: place.longitude,
    costMinUSD: place.costMinUSD || null,
    costMaxUSD: place.costMaxUSD || null,
    rating: place.rating || null,
    totalRatings: place.totalRatings || null,
    topReviews: place.topReviews || [],
    imageUrls: place.imageUrls || [],
    imageUrl: place.imageUrl || null,
    scamWarning: place.scamWarning || null,
    bestTimeToVisit: place.bestTimeToVisit || null,
    crowdLevel: 'MODERATE',
    openingHours: place.openingHours || null,
  };
}

/**
 * Map a place to minimal meal response format
 */
export function mapPlaceToMeal(place: PlaceLike | null): MealResponse | null {
  if (!place) return null;
  return {
    id: place.id,
    name: place.name,
    category: String(place.category),
  };
}

/**
 * Map a place to hotel response format
 */
export function mapPlaceToHotel(place: PlaceLike | null): HotelResponse | null {
  if (!place) return null;
  return {
    id: place.id,
    name: place.name,
    category: String(place.category),
    latitude: place.latitude,
    longitude: place.longitude,
    imageUrl: place.imageUrl || null,
  };
}

/**
 * Map airport config to response format
 */
export function mapAirportToResponse(
  airportConfig: { name: string; code: string; latitude: number; longitude: number } | null,
  fallback: { country: string; code: string }
): AirportResponse {
  if (airportConfig) {
    return {
      name: airportConfig.name,
      code: airportConfig.code,
      latitude: airportConfig.latitude,
      longitude: airportConfig.longitude,
    };
  }
  return {
    name: `${fallback.country} Airport`,
    code: fallback.code,
    latitude: 0,
    longitude: 0,
  };
}

/**
 * Map a place for generate response (includes optional index-based id fallback)
 */
export function mapPlaceForGenerateResponse(
  loc: PlaceLike | null,
  idx: number,
  dayNum: number
): LocationResponse | null {
  if (!loc) return null;
  return {
    id: loc.id || `loc-${dayNum}-${idx}`,
    name: loc.name,
    classification: String(loc.classification || 'CONDITIONAL'),
    category: String(loc.category),
    description: loc.description || '',
    latitude: loc.latitude,
    longitude: loc.longitude,
    costMinUSD: loc.costMinUSD || null,
    costMaxUSD: loc.costMaxUSD || null,
    rating: loc.rating || null,
    totalRatings: loc.totalRatings || null,
    topReviews: loc.topReviews || [],
    imageUrls: loc.imageUrls || [],
    imageUrl: loc.imageUrl || null,
    scamWarning: loc.scamWarning || null,
    bestTimeToVisit: loc.bestTimeToVisit || null,
    crowdLevel: loc.crowdLevel || 'MODERATE',
    openingHours: loc.openingHours || null,
  };
}
