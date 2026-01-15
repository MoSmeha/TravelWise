/**
 * Places Provider Contract
 * Defines the interface for places-related data operations.
 * Controllers/services depend on this interface, not on concrete implementations.
 */

import { LocationCategory, LocationClassification, PriceLevel } from '@prisma/client';

// ============================================================================
// Input Types (for creating/updating data)
// ============================================================================

export interface PlaceFilters {
  city?: string;
  category?: LocationCategory;
  classification?: LocationClassification;
  activityType?: string;
  limit?: number;
  offset?: number;
}

export interface CreatePlaceData {
  name: string;
  description: string;
  classification: LocationClassification;
  category: LocationCategory;
  googlePlaceId?: string;
  latitude: number;
  longitude: number;
  address?: string;
  city: string;
  rating?: number | null;
  totalRatings?: number | null;
  priceLevel?: PriceLevel;
  openingHours?: any;
  topReviews?: any[];
  sources?: string[];
  sourceUrls?: string[];
  activityTypes?: string[];
}

export interface PlaceEnrichmentData {
  googlePlaceId?: string;
  rating?: number | null;
  totalRatings?: number | null;
  priceLevel?: PriceLevel;
  topReviews?: any;
  imageUrls?: string[];
  imageUrl?: string;
  openingHours?: any;
  lastEnrichedAt?: Date;
}

// ============================================================================
// Output Types (what the provider returns)
// ============================================================================

export interface PlaceRecord {
  id: string;
  name: string;
  description: string;
  classification: LocationClassification;
  category: LocationCategory;
  googlePlaceId: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string;
  country: string;
  rating: number | null;
  totalRatings: number | null;
  priceLevel: PriceLevel | null;
  openingHours: any;
  topReviews: any;
  imageUrl: string | null;
  imageUrls: string[];
  lastEnrichedAt: Date | null;
}

export interface CityCount {
  name: string;
  placeCount: number;
}

export interface CategoryCount {
  name: LocationCategory;
  placeCount: number;
}

export interface PaginatedPlaces {
  data: PlaceRecord[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ============================================================================
// Provider Contract Interface
// ============================================================================

export interface IPlacesProvider {
  // -------------------------------------------------------------------------
  // Read Operations
  // -------------------------------------------------------------------------

  /**
   * Find a place by name (case-insensitive)
   */
  findByName(name: string): Promise<PlaceRecord | null>;

  /**
   * Find a place by Google Place ID
   */
  findByGooglePlaceId(googlePlaceId: string): Promise<PlaceRecord | null>;

  /**
   * Find a place by ID
   */
  findById(id: string): Promise<PlaceRecord | null>;

  /**
   * List places with filters and pagination
   */
  findMany(filters: PlaceFilters): Promise<PaginatedPlaces>;

  /**
   * Get city grouping with place counts
   */
  groupByCity(): Promise<CityCount[]>;

  /**
   * Get category grouping with place counts
   */
  groupByCategory(): Promise<CategoryCount[]>;

  // -------------------------------------------------------------------------
  // Write Operations
  // -------------------------------------------------------------------------

  /**
   * Create a new place
   */
  create(data: CreatePlaceData): Promise<PlaceRecord>;

  /**
   * Update place with enrichment data from Google
   */
  updateEnrichment(id: string, data: PlaceEnrichmentData): Promise<void>;
}
