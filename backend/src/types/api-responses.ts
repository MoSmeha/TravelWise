/**
 * API Response Types
 * Typed interfaces for all API responses
 * Ensures consistency across controllers and enables autocomplete
 */

import { LocationCategory, LocationClassification } from '@prisma/client';

// ============================================================================
// Common Response Types
// ============================================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// Itinerary Response Types
// ============================================================================

export interface ItinerarySummaryResponse {
  id: string;
  numberOfDays: number;
  budgetUSD: number;
  totalEstimatedCostUSD: number | null;
  travelStyles: string[];
}

export interface BudgetBreakdownResponse {
  food: number;
  activities: number;
  transport: number;
  accommodation: number;
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

export interface MealsResponse {
  breakfast: MealResponse | null;
  lunch: MealResponse | null;
  dinner: MealResponse | null;
}

export interface HotelResponse {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
}

export interface DayResponse {
  id: string;
  dayNumber: number;
  theme: string | null;
  description: string;
  locations: LocationResponse[];
  meals: MealsResponse;
  hotel: HotelResponse | null;
  routeDescription?: string;
}

export interface AirportResponse {
  name: string;
  code: string;
  latitude: number;
  longitude: number;
}

export interface CountryResponse {
  id: string;
  name: string;
  code: string;
  currency: string;
}

export interface WarningResponse {
  id: string;
  title: string;
  description: string;
}

export interface TouristTrapResponse {
  id: string;
  name: string;
  reason: string;
}

export interface ItineraryDetailsResponse {
  source: 'DATABASE';
  itinerary: ItinerarySummaryResponse;
  days: DayResponse[];
  airport: AirportResponse;
  warnings: WarningResponse[];
  touristTraps: TouristTrapResponse[];
  localTips: string[];
  routeSummary: string | null;
}

export interface GenerateItineraryResponse extends ItineraryDetailsResponse {
  hotel: HotelResponse | null;
  country: CountryResponse;
  itinerary: ItinerarySummaryResponse & {
    budgetBreakdown: BudgetBreakdownResponse;
  };
}

// ============================================================================
// Checklist Response Types
// ============================================================================

export interface ChecklistItemResponse {
  id: string;
  itineraryId: string;
  category: string;
  item: string;
  reason: string | null;
  isChecked: boolean;
  source: string | null;
  createdAt: Date;
}

// ============================================================================
// Places Response Types
// ============================================================================

export interface PlaceResponse {
  id: string;
  name: string;
  description: string;
  classification: LocationClassification;
  category: LocationCategory;
  latitude: number;
  longitude: number;
  city: string;
  rating: number | null;
  totalRatings: number | null;
  imageUrl: string | null;
  imageUrls: string[];
}

export interface PhotosResponse {
  photos: string[];
  reviews: ReviewResponse[];
}

export interface ReviewResponse {
  author: string;
  rating: number;
  text: string;
  time: string;
}

export interface PaginationResponse {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PaginatedPlacesResponse {
  data: PlaceResponse[];
  pagination: PaginationResponse;
}
