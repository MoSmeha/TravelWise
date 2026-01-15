import { CIRCUIT_BREAKERS, CircuitOpenError, withCircuitBreaker } from '../lib/circuit-breaker';
import { CACHE_KEYS, CACHE_TTL, cacheGet, cacheSet } from './cache.service';

// ==========================================
// GOOGLE PLACES SERVICE
// Enriches places with data from Google Places API
// Includes graceful degradation and caching
// ==========================================

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GOOGLE_PLACES_BASE_URL = 'https://maps.googleapis.com/maps/api/place';

// Types
export interface PlaceEnrichment {
  googlePlaceId: string;
  name: string;
  rating: number;
  totalRatings: number;
  priceLevel: number | null;
  openingHours: WeeklyHours | null;
  topReviews: Review[];
  photos: string[];
  formattedAddress: string;
  phoneNumber: string | null;
  website: string | null;
  types: string[];
  geometry?: {
    location: { lat: number; lng: number };
    viewport?: any;
  };
  editorialSummary?: string;
}

export interface WeeklyHours {
  weekdayText: string[];
  weekdayDescriptions?: string[];
  isOpen: boolean;
  periods: Array<{
    open: { day: number; time: string };
    close: { day: number; time: string };
  }>;
}

export interface Review {
  authorName: string;
  rating: number;
  text: string;
  relativeTimeDescription: string;
}

export interface PlaceEnrichmentResult {
  data: PlaceEnrichment | null;
  source: 'live' | 'cache' | 'unavailable';
  isStale: boolean;
  lastUpdated: Date | null;
  error?: string;
}

// Check if API is configured
export function isGooglePlacesConfigured(): boolean {
  return !!GOOGLE_PLACES_API_KEY && GOOGLE_PLACES_API_KEY !== 'your_google_places_api_key_here';
}

// Search for a place by name and location
export async function searchPlace(
  name: string,
  lat?: number,
  lng?: number,
  radius: number = 1000
): Promise<PlaceEnrichmentResult> {
  const cacheKey = CACHE_KEYS.googlePlaceSearch(name, lat || 0, lng || 0);
  
  // Check cache first
  const cached = cacheGet<PlaceEnrichment>(cacheKey);
  if (cached) {
    return { 
      data: cached, 
      source: 'cache', 
      isStale: false,
      lastUpdated: new Date(),
    };
  }
  
  if (!isGooglePlacesConfigured()) {
    return {
      data: null,
      source: 'unavailable',
      isStale: true,
      lastUpdated: null,
      error: 'Google Places API not configured',
    };
  }
  
  try {
    const result = await withCircuitBreaker(
      CIRCUIT_BREAKERS.googlePlaces,
      'Google Places',
      async () => {
        const url = new URL(`${GOOGLE_PLACES_BASE_URL}/findplacefromtext/json`);
        url.searchParams.set('input', name);
        url.searchParams.set('inputtype', 'textquery');
        if (lat && lng) {
          url.searchParams.set('locationbias', `circle:${radius}@${lat},${lng}`);
        }
        url.searchParams.set('fields', 'place_id,name,formatted_address,geometry');
        url.searchParams.set('key', GOOGLE_PLACES_API_KEY!);
        
        const response = await fetch(url.toString());
        
        if (!response.ok) {
          throw new Error(`Google Places API error: ${response.status}`);
        }
        
        return response.json();
      }
    );

    const data: any = result as any;
    
    if (data.status === 'OK' && data.candidates?.[0]) {
      const candidate = data.candidates[0];
      
      // Get detailed info
      const details = await getPlaceDetails(candidate.place_id);
      
      if (details.data) {
        cacheSet(cacheKey, details.data, CACHE_TTL.placeSearch);
        return details;
      }
    }
    
    return {
      data: null,
      source: 'unavailable',
      isStale: true,
      lastUpdated: null,
      error: 'Place not found',
    };
    
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      console.warn('Google Places circuit breaker is open');
    }
    
    return {
      data: null,
      source: 'unavailable',
      isStale: true,
      lastUpdated: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Get detailed place information by Place ID
export async function getPlaceDetails(googlePlaceId: string): Promise<PlaceEnrichmentResult> {
  const cacheKey = CACHE_KEYS.googlePlace(googlePlaceId);
  
  // Check cache first
  const cached = cacheGet<PlaceEnrichment>(cacheKey);
  if (cached) {
    return { 
      data: cached, 
      source: 'cache', 
      isStale: false,
      lastUpdated: new Date(),
    };
  }
  
  if (!isGooglePlacesConfigured()) {
    return {
      data: null,
      source: 'unavailable',
      isStale: true,
      lastUpdated: null,
      error: 'Google Places API not configured',
    };
  }
  
  try {
    const result = await withCircuitBreaker(
      CIRCUIT_BREAKERS.googlePlaces,
      'Google Places',
      async () => {
        const fields = [
          'place_id', 'name', 'rating', 'user_ratings_total', 'price_level',
          'opening_hours', 'reviews', 'photos', 'formatted_address',
          'formatted_phone_number', 'website', 'types', 'geometry', 'editorial_summary'
        ].join(',');
        
        const url = new URL(`${GOOGLE_PLACES_BASE_URL}/details/json`);
        url.searchParams.set('place_id', googlePlaceId);
        url.searchParams.set('fields', fields);
        url.searchParams.set('key', GOOGLE_PLACES_API_KEY!);
        
        const response = await fetch(url.toString());
        
        if (!response.ok) {
          throw new Error(`Google Places API error: ${response.status}`);
        }
        
        return response.json();
      }
    );

    const data: any = result as any;
    
    if (data.status === 'OK' && data.result) {
      const place = data.result;
      
      const enrichment: PlaceEnrichment = {
        googlePlaceId: place.place_id,
        name: place.name,
        rating: place.rating || 0,
        totalRatings: place.user_ratings_total || 0,
        priceLevel: place.price_level ?? null,
        openingHours: place.opening_hours ? {
          weekdayText: place.opening_hours.weekday_text || [],
          weekdayDescriptions: place.opening_hours.weekday_text || [], // Google often executes this as weekday_text
          isOpen: place.opening_hours.open_now || false,
          periods: place.opening_hours.periods || [],
        } : null,
        topReviews: (place.reviews || []).slice(0, 3).map((r: any) => ({
          authorName: r.author_name,
          rating: r.rating,
          text: r.text,
          relativeTimeDescription: r.relative_time_description,
        })),
        photos: (place.photos || []).slice(0, 5).map((p: any) => 
          `${GOOGLE_PLACES_BASE_URL}/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
        ),
        formattedAddress: place.formatted_address || '',
        phoneNumber: place.formatted_phone_number || null,
        website: place.website || null,
        types: place.types || [],
        geometry: place.geometry,
        editorialSummary: place.editorial_summary?.overview || null,
      };
      
      // Cache the result
      cacheSet(cacheKey, enrichment, CACHE_TTL.googlePlace);
      
      return {
        data: enrichment,
        source: 'live',
        isStale: false,
        lastUpdated: new Date(),
      };
    }
    
    return {
      data: null,
      source: 'unavailable',
      isStale: true,
      lastUpdated: null,
      error: `Place details not found: ${(result as any).status}`,
    };
    
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      console.warn('Google Places circuit breaker is open');
    }
    
    return {
      data: null,
      source: 'unavailable',
      isStale: true,
      lastUpdated: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Validate if a place still exists
export async function validatePlaceExists(googlePlaceId: string): Promise<boolean> {
  const result = await getPlaceDetails(googlePlaceId);
  return result.data !== null;
}

// Enrich a place with Google Places data (for itinerary generation)
export async function enrichPlaceWithGoogleData(
  name: string,
  lat: number,
  lng: number
): Promise<PlaceEnrichmentResult> {
  console.log(`🔍 Enriching "${name}" with Google Places data...`);
  
  // Search for the place
  const searchResult = await searchPlace(name, lat, lng, 2000);
  
  if (!searchResult.data) {
    console.warn(`⚠️ Could not find Google Places data for "${name}"`);
    return searchResult;
  }
  
  console.log(`✅ Found Google Places data for "${name}" (${searchResult.data.rating} stars, ${searchResult.data.totalRatings} reviews)`);
  
  return searchResult;
}
