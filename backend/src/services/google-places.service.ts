import { CIRCUIT_BREAKERS, CircuitOpenError, withCircuitBreaker } from '../lib/circuit-breaker.js';
import { CACHE_KEYS, CACHE_TTL, cacheGet, cacheSet } from './cache.service.js';


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

export async function enrichPlaceWithGoogleData(
  name: string,
  lat: number,
  lng: number
): Promise<PlaceEnrichmentResult> {
  console.log(`[SEARCH] Enriching "${name}" with Google Places data...`);
  
  // Search for the place
  const searchResult = await searchPlace(name, lat, lng, 2000);
  
  if (!searchResult.data) {
    console.warn(`[WARN] Could not find Google Places data for "${name}"`);
    return searchResult;
  }
  
  console.log(`[SUCCESS] Found Google Places data for "${name}" (${searchResult.data.rating} stars, ${searchResult.data.totalRatings} reviews)`);
  
  return searchResult;
}

// Hotel search result with booking links
export interface HotelSearchResult {
  googlePlaceId: string;
  name: string;
  rating: number;
  totalRatings: number;
  latitude: number;
  longitude: number;
  formattedAddress: string;
  websiteUrl: string | null;
  bookingUrl: string;
  photos: string[];
  priceLevel: number | null;
}

// Search for nearby hotels using Google Places Nearby Search API
export async function searchNearbyHotels(
  lat: number,
  lng: number,
  radiusMeters: number = 5000,
  minRating: number = 4.0
): Promise<{ hotels: HotelSearchResult[]; source: 'live' | 'cache' | 'unavailable' }> {
  const cacheKey = `nearby-hotels:${lat.toFixed(4)},${lng.toFixed(4)}:${radiusMeters}`;
  
  // Check cache first
  const cached = cacheGet<HotelSearchResult[]>(cacheKey);
  if (cached) {
    console.log(`[CACHE] Found ${cached.length} cached hotels near ${lat},${lng}`);
    return { hotels: cached, source: 'cache' };
  }
  
  if (!isGooglePlacesConfigured()) {
    console.warn('[WARN] Google Places API not configured for hotel search');
    return { hotels: [], source: 'unavailable' };
  }
  
  try {
    const result = await withCircuitBreaker(
      CIRCUIT_BREAKERS.googlePlaces,
      'Google Places Nearby Search',
      async () => {
        const url = new URL(`${GOOGLE_PLACES_BASE_URL}/nearbysearch/json`);
        url.searchParams.set('location', `${lat},${lng}`);
        url.searchParams.set('radius', radiusMeters.toString());
        url.searchParams.set('type', 'lodging');
        url.searchParams.set('key', GOOGLE_PLACES_API_KEY!);
        
        const response = await fetch(url.toString());
        
        if (!response.ok) {
          throw new Error(`Google Places Nearby Search error: ${response.status}`);
        }
        
        return response.json();
      }
    );

    const data: any = result as any;
    
    if (data.status === 'OK' && data.results?.length > 0) {
      // Filter by rating and sort by rating descending
      const filteredResults = data.results
        .filter((place: any) => (place.rating || 0) >= minRating)
        .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 5); // Top 5 results
      
      // Enrich each hotel with details (for website URL)
      const hotels: HotelSearchResult[] = [];
      
      for (const place of filteredResults) {
        // Get detailed info for website URL
        const details = await getPlaceDetails(place.place_id);
        
        const hotelName = place.name || 'Unknown Hotel';
        const hotelLat = place.geometry?.location?.lat || lat;
        const hotelLng = place.geometry?.location?.lng || lng;
        
        // Build Booking.com fallback URL
        const bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(hotelName)}&latitude=${hotelLat}&longitude=${hotelLng}`;
        
        hotels.push({
          googlePlaceId: place.place_id,
          name: hotelName,
          rating: place.rating || 0,
          totalRatings: place.user_ratings_total || 0,
          latitude: hotelLat,
          longitude: hotelLng,
          formattedAddress: place.vicinity || details.data?.formattedAddress || '',
          websiteUrl: details.data?.website || null,
          bookingUrl,
          photos: details.data?.photos || [],
          priceLevel: place.price_level ?? null,
        });
      }
      
      console.log(`[HOTEL] Found ${hotels.length} hotels near ${lat},${lng} with rating >= ${minRating}`);
      
      // Cache for 24 hours
      cacheSet(cacheKey, hotels, 24 * 60 * 60 * 1000);
      
      return { hotels, source: 'live' };
    }
    
    console.log(`[HOTEL] No hotels found near ${lat},${lng}`);
    return { hotels: [], source: 'live' };
    
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      console.warn('[WARN] Google Places circuit breaker is open for hotel search');
    } else {
      console.error('[ERROR] Hotel search failed:', error);
    }
    
    return { hotels: [], source: 'unavailable' };
  }
}

