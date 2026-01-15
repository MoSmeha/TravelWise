/**
 * Places Service
 * Handles business logic for places: search, caching, enrichment
 * Uses the places provider for data access (provider-contract pattern)
 */

import { placesProvider } from '../providers/places.provider.pg';
import {
  IPlacesProvider,
  PlaceFilters,
  PlaceRecord,
  PaginatedPlaces,
  CityCount,
  CategoryCount,
  PlaceEnrichmentData,
} from '../provider-contract/places.provider-contract';
import {
  isGooglePlacesConfigured,
  searchPlace as googleSearchPlace,
  getPlaceDetails as googleGetDetails,
  PlaceEnrichment
} from './google-places.service';
import { extractCityFromAddress } from '../utils/enum-mappers';
import { mapGooglePriceLevel } from '../utils/prisma-helpers';

// ============================================================================
// Configuration
// ============================================================================

const CACHE_FRESHNESS_DAYS = 7;

// ============================================================================
// Types
// ============================================================================

export interface PhotosAndReviews {
  photos: string[];
  reviews: { author: string; rating: number; text: string; time: string }[];
}

export interface SearchPlaceResult {
  place: PlaceRecord | null;
  source: 'db' | 'google_ingest';
  message?: string;
}

// ============================================================================
// Places Service Class
// ============================================================================

export class PlacesService {
  constructor(private provider: IPlacesProvider = placesProvider) {}

  // -------------------------------------------------------------------------
  // Read Operations
  // -------------------------------------------------------------------------

  /**
   * Get a place by ID
   */
  async getPlaceById(id: string): Promise<PlaceRecord | null> {
    return this.provider.findById(id);
  }

  /**
   * List places with filters and pagination
   */
  async listPlaces(filters: PlaceFilters): Promise<PaginatedPlaces> {
    return this.provider.findMany({
      ...filters,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });
  }

  /**
   * Get cities with place counts
   */
  async getCities(): Promise<CityCount[]> {
    return this.provider.groupByCity();
  }

  /**
   * Get categories with place counts
   */
  async getCategories(): Promise<CategoryCount[]> {
    return this.provider.groupByCategory();
  }

  // -------------------------------------------------------------------------
  // Search & Ingest
  // -------------------------------------------------------------------------

  /**
   * Search for a place - checks DB first, then falls back to Google with ingestion
   */
  async searchPlace(name: string, lat?: number, lng?: number): Promise<SearchPlaceResult> {
    // 1. Check DB first (exact match or close enough)
    const existingPlace = await this.provider.findByName(name);

    if (existingPlace) {
      console.log(`Found ${name} in DB.`);
      return { place: existingPlace, source: 'db' };
    }

    // 2. If not in DB, search Google Places
    if (!isGooglePlacesConfigured()) {
      console.log('No GOOGLE_PLACES_API_KEY configured');
      return { place: null, source: 'db', message: 'Google Places API not configured' };
    }

    console.log('Fetching Google Places for:', name);
    const googleResult = await googleSearchPlace(name, lat, lng);

    if (!googleResult.data) {
      console.log('No candidates found:', googleResult.error);
      return { place: null, source: 'google_ingest' };
    }

    const details = googleResult.data;

    // Check if we already have this googlePlaceId
    const existingByGoogleId = await this.provider.findByGooglePlaceId(details.googlePlaceId);

    if (existingByGoogleId) {
      console.log(`Found ${name} in DB by Google ID.`);
      return { place: existingByGoogleId, source: 'db' };
    }

    // Extract city from formatted address
    const city = extractCityFromAddress(details.formattedAddress || '');

    const topReviews = details.topReviews.map(r => ({
      author: r.authorName,
      rating: r.rating,
      text: r.text,
      time: r.relativeTimeDescription,
    }));

    // 4. Ingest into DB
    const newPlace = await this.provider.create({
      name: details.name,
      description: details.editorialSummary || details.formattedAddress || 'No description available',
      classification: 'CONDITIONAL',
      category: 'OTHER',
      googlePlaceId: details.googlePlaceId,
      latitude: details.geometry?.location?.lat || 0,
      longitude: details.geometry?.location?.lng || 0,
      address: details.formattedAddress,
      city,
      rating: details.rating,
      totalRatings: details.totalRatings,
      priceLevel: mapGooglePriceLevel(details.priceLevel) || undefined,
      openingHours: details.openingHours as any,
      topReviews: topReviews as any,
      sources: ['google'],
      sourceUrls: [],
      activityTypes: [],
    });

    console.log(`Ingested ${newPlace.name} into DB.`);

    return { place: newPlace, source: 'google_ingest' };
  }

  // -------------------------------------------------------------------------
  // Photos & Enrichment
  // -------------------------------------------------------------------------

  /**
   * Get photos and reviews for a place - uses cache if fresh, otherwise fetches from Google
   */
  async getPhotosAndReviews(
    name: string,
    id?: string,
    lat?: number,
    lng?: number
  ): Promise<PhotosAndReviews> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - CACHE_FRESHNESS_DAYS);

    // 1. Check DB first for valid cache
    let existingPlace: PlaceRecord | null = null;

    if (id) {
      existingPlace = await this.provider.findById(id);
    }

    if (!existingPlace) {
      existingPlace = await this.provider.findByName(name);
    }

    // Return cached data if fresh
    if (existingPlace?.lastEnrichedAt && existingPlace.lastEnrichedAt > sevenDaysAgo) {
      if (existingPlace.imageUrls && existingPlace.imageUrls.length > 0) {
        console.log(`Returning cached data for: ${name} (ID: ${existingPlace.id})`);

        const cachedReviews = (existingPlace.topReviews as any[])?.map((r: any) => ({
          author: r.author_name || r.author,
          rating: r.rating,
          text: r.text,
          time: r.relative_time_description || r.time,
        })) || [];

        return { photos: existingPlace.imageUrls, reviews: cachedReviews };
      }
    }

    // 2. Not in DB or stale -> Fetch from Google
    if (!isGooglePlacesConfigured()) {
      return { photos: [], reviews: [] };
    }

    let googleData: PlaceEnrichment | null = null;

    if (existingPlace && existingPlace.googlePlaceId) {
      // Refresh using ID
      const result = await googleGetDetails(existingPlace.googlePlaceId);
      googleData = result.data;
    } else {
      // Search by name
      const result = await googleSearchPlace(name, lat, lng);
      googleData = result.data;
    }

    if (googleData) {
      const photos = googleData.photos;
      const reviews = googleData.topReviews.map(r => ({
        author: r.authorName,
        rating: r.rating,
        text: r.text,
        time: r.relativeTimeDescription,
      }));

      // 3. Update DB with new data if we have a matching record
      if (existingPlace) {
        await this.provider.updateEnrichment(existingPlace.id, {
          googlePlaceId: googleData.googlePlaceId,
          imageUrls: photos,
          topReviews: reviews as any,
          rating: googleData.rating,
          totalRatings: googleData.totalRatings,
          priceLevel: mapGooglePriceLevel(googleData.priceLevel) || undefined,
          openingHours: googleData.openingHours as any,
          lastEnrichedAt: new Date(),
        });
        console.log(`Refreshed cache for: ${name}`);
      }

      return { photos, reviews };
    }

    return { photos: [], reviews: [] };
  }

  /**
   * Update a place with enrichment data
   */
  async updatePlaceEnrichment(id: string, data: PlaceEnrichmentData): Promise<void> {
    return this.provider.updateEnrichment(id, data);
  }
}


export const placesService = new PlacesService();
