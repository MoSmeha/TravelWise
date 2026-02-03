import { LocationCategory, Place } from '../../generated/prisma/client.js';
import { BudgetLevel, TravelStyle } from '../shared/utils/enum-mappers.js';

/**
 * Extended Place type with additional dynamic properties
 */
export type PlaceExtended = Place & { [key: string]: any };

/**
 * Parameters for generating an itinerary
 */
export interface GenerateItineraryParams {
  cityId: string; // Treated as city name or country ID
  numberOfDays: number;
  budgetLevel: BudgetLevel;
  travelStyles: TravelStyle[]; // Array of styles (max 3)
  budgetUSD: number;
  userId?: string;
  countryId?: string;
}

/**
 * Result structure for a single day in the itinerary
 */
export interface ItineraryDayResult {
  id: string;
  dayNumber: number;
  description: string;
  routeDescription: string;
  locations: PlaceExtended[];
  hotel: PlaceExtended | null;
  startingHotel?: PlaceExtended | null;
  meals: {
    breakfast: PlaceExtended | null;
    lunch: PlaceExtended | null;
    dinner: PlaceExtended | null;
  };
  theme?: string;
  isLastDay?: boolean;
}

/**
 * Complete itinerary generation result
 */
export interface ItineraryResult {
  itinerary: {
    numberOfDays: number;
    budgetUSD: number;
    budgetLevel?: BudgetLevel;
    travelStyles?: TravelStyle[];
  };
  days: ItineraryDayResult[];
  hotel: PlaceExtended | null; // Primary hotel for the trip
  totalEstimatedCostUSD: number;
  routeSummary: string;
  warnings: Array<{ title: string; description: string }>;
  touristTraps: Array<{ name: string; reason: string }>;
  localTips: string[];
  checklist: Array<{ category: string; item: string; reason: string }>;
}

/**
 * Location data for route optimization
 */
export interface DayLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  [key: string]: any;
}

/**
 * Day with locations for enrichment
 */
export interface DayWithLocations {
  locations: DayLocation[];
  [key: string]: any;
}

/**
 * Hotel category types for filtering
 */
export const HOTEL_CATEGORIES: LocationCategory[] = [
  LocationCategory.HOTEL, 
  LocationCategory.ACCOMMODATION
];

/**
 * Activity categories mapped to travel styles
 */
export const ACTIVITY_CATEGORIES: Record<TravelStyle, LocationCategory[]> = {
  ADVENTURE: [LocationCategory.HIKING, LocationCategory.ACTIVITY, LocationCategory.BEACH, LocationCategory.PARK, LocationCategory.VIEWPOINT],
  CULTURAL: [LocationCategory.HISTORICAL_SITE, LocationCategory.MUSEUM, LocationCategory.RELIGIOUS_SITE, LocationCategory.MARKET],
  NATURE_ECO: [LocationCategory.PARK, LocationCategory.HIKING, LocationCategory.BEACH, LocationCategory.VIEWPOINT],
  BEACH_RELAXATION: [LocationCategory.BEACH, LocationCategory.CAFE, LocationCategory.VIEWPOINT, LocationCategory.PARK],
  URBAN_CITY: [LocationCategory.SHOPPING, LocationCategory.MARKET, LocationCategory.VIEWPOINT],
  FAMILY_GROUP: [LocationCategory.MUSEUM, LocationCategory.PARK, LocationCategory.ACTIVITY, LocationCategory.SHOPPING],
};
