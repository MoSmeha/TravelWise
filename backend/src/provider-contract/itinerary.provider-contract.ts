/**
 * Itinerary Provider Contract
 * Defines the interface for itinerary-related data operations.
 * Controllers/services depend on this interface, not on concrete implementations.
 */

import { LocationCategory, LocationClassification, ItineraryItemType, ChecklistCategory } from '@prisma/client';

// ============================================================================
// Input Types (for creating/updating data)
// ============================================================================

export interface FetchPlacesParams {
  categories: LocationCategory[];
  country: string;
  city: string | null;
  limit: number;
  excludeIds?: string[];
}

export interface CreateItineraryData {
  userId: string;
  country: string;
  airportCode: string;
  numberOfDays: number;
  budgetUSD: number;
  travelStyles: string[];
  flightDate?: Date | null;
  totalEstimatedCostUSD?: number;
  routeSummary?: string;
}

export interface CreateItineraryDayData {
  itineraryId: string;
  dayNumber: number;
  theme?: string;
  description?: string;
  hotelId?: string | null;
}

export interface CreateItineraryItemData {
  dayId: string;
  orderInDay: number;
  placeId: string;
  itemType: ItineraryItemType;
  notes?: string | null;
  suggestedDuration?: number;
}

export interface CreateChecklistItemData {
  itineraryId: string;
  category: ChecklistCategory;
  item: string;
  reason?: string;
}

export interface UpdatePlaceEnrichmentData {
  googlePlaceId?: string;
  rating?: number | null;
  totalRatings?: number | null;
  topReviews?: any;
  imageUrls?: string[];
  openingHours?: any;
  imageUrl?: string;
  lastEnrichedAt?: Date;
}

// ============================================================================
// Output Types (what the provider returns)
// ============================================================================

/**
 * Place record from database
 */
export interface PlaceRecord {
  id: string;
  name: string;
  classification: LocationClassification;
  category: LocationCategory;
  description: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  costMinUSD: number | null;
  costMaxUSD: number | null;
  rating: number | null;
  totalRatings: number | null;
  topReviews: any;
  imageUrl: string | null;
  imageUrls: string[];
  googlePlaceId: string | null;
  openingHours: any;
  bestTimeToVisit: string | null;
  scamWarning: string | null;
  popularity: number;
  activityTypes: string[];
  address: string | null;
  localTip: string | null;
  // Allow additional fields for flexibility
  [key: string]: any;
}

/**
 * User itinerary summary for listings
 */
export interface UserItinerarySummary {
  id: string;
  country: string;
  numberOfDays: number;
  budgetUSD: number;
  travelStyles: string[];
  totalEstimatedCostUSD: number | null;
  createdAt: Date;
  updatedAt: Date;
  flightDate: Date | null;
}

/**
 * Full itinerary with relations
 */
export interface UserItineraryWithDays {
  id: string;
  country: string;
  airportCode: string;
  numberOfDays: number;
  budgetUSD: number;
  travelStyles: string[];
  totalEstimatedCostUSD: number | null;
  routeSummary: string | null;
  days: ItineraryDayWithItems[];
  checklist: ChecklistItemRecord[];
}

export interface ItineraryDayWithItems {
  id: string;
  dayNumber: number;
  theme: string | null;
  description: string | null;
  hotel: PlaceRecord | null;
  items: ItineraryItemWithPlace[];
}

export interface ItineraryItemWithPlace {
  id: string;
  orderInDay: number;
  itemType: ItineraryItemType;
  notes: string | null;
  place: PlaceRecord;
}

export interface ChecklistItemRecord {
  id: string;
  category: ChecklistCategory;
  item: string;
  reason: string | null;
  isChecked: boolean;
}

export interface ItineraryDayRecord {
  id: string;
  itineraryId: string;
  dayNumber: number;
  theme: string | null;
  description: string | null;
  hotelId: string | null;
}

export interface CreatedItinerary {
  id: string;
  userId: string | null;
  country: string;
  airportCode: string;
  numberOfDays: number;
  budgetUSD: number;
  travelStyles: string[];
  totalEstimatedCostUSD: number | null;
  routeSummary: string | null;
}

// ============================================================================
// Provider Contract Interface
// ============================================================================

export interface IItineraryProvider {
  // -------------------------------------------------------------------------
  // Place Operations
  // -------------------------------------------------------------------------
  
  /**
   * Fetch places from database with filtering
   */
  fetchPlaces(params: FetchPlacesParams): Promise<PlaceRecord[]>;
  
  /**
   * Find a place by its Google Place ID
   */
  findPlaceByGoogleId(googlePlaceId: string): Promise<{ id: string } | null>;
  
  /**
   * Update place with Google enrichment data
   */
  updatePlaceEnrichment(placeId: string, data: UpdatePlaceEnrichmentData): Promise<void>;

  // -------------------------------------------------------------------------
  // Itinerary Operations
  // -------------------------------------------------------------------------
  
  /**
   * Create a new user itinerary
   */
  createItinerary(data: CreateItineraryData): Promise<CreatedItinerary>;
  
  /**
   * Find itinerary by ID with full relations (days, items, checklist)
   */
  findItineraryById(id: string): Promise<UserItineraryWithDays | null>;
  
  /**
   * Find all itineraries for a user (summary only)
   */
  findUserItineraries(userId: string): Promise<UserItinerarySummary[]>;

  // -------------------------------------------------------------------------
  // Day & Item Operations
  // -------------------------------------------------------------------------
  
  /**
   * Create an itinerary day
   */
  createItineraryDay(data: CreateItineraryDayData): Promise<ItineraryDayRecord>;
  
  /**
   * Create an itinerary item
   */
  createItineraryItem(data: CreateItineraryItemData): Promise<{ id: string }>;
  
  /**
   * Create a checklist item
   */
  createChecklistItem(data: CreateChecklistItemData): Promise<{ id: string }>;
}
