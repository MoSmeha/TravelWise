// ============ ENUMS & TYPES ============

export type LocationClassification = 'HIDDEN_GEM' | 'CONDITIONAL' | 'TOURIST_TRAP' | 'MUST_SEE';
export type CrowdLevel = 'QUIET' | 'MODERATE' | 'BUSY';
export type PriceLevel = 'INEXPENSIVE' | 'MODERATE' | 'EXPENSIVE';
export type LocationCategory =
  | 'RESTAURANT' | 'CAFE' | 'BAR' | 'NIGHTCLUB'
  | 'BEACH' | 'HIKING' | 'HISTORICAL_SITE' | 'MUSEUM'
  | 'MARKET' | 'VIEWPOINT' | 'PARK' | 'RELIGIOUS_SITE'
  | 'SHOPPING' | 'ACTIVITY' | 'HOTEL' | 'ACCOMMODATION' | 'OTHER';

export type BudgetLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type TravelStyle = 
  | 'ADVENTURE' | 'CULTURAL' | 'NATURE_ECO' 
  | 'BEACH_RELAXATION' | 'URBAN_CITY' | 'FAMILY_GROUP';

// ============ COUNTRY & AIRPORT ============

export interface Airport {
  name: string;
  code: string;
  latitude: number;
  longitude: number;
}

export interface CountryConfig {
  key: string;
  name: string;
  code: string;
  currency: string;
  minBudgetPerDay: number;
  airports: Airport[];
  regions?: string[];
}

// ============ LOCATION ============

export interface Location {
  id: string;
  name: string;
  classification: LocationClassification;
  category: LocationCategory | string;
  description: string;
  costMinUSD?: number;
  costMaxUSD?: number;
  crowdLevel?: CrowdLevel | string;
  bestTimeToVisit?: string;
  latitude: number;
  longitude: number;
  aiReasoning?: string;
  scamWarning?: string;
  travelTimeFromPrevious?: string;
  imageUrl?: string;
  imageUrls?: string[];
  // Enriched data
  rating?: number;
  totalRatings?: number;
  topReviews?: any[];
  priceLevel?: PriceLevel;
  openingHours?: any;
}

// ============ HOTEL ============

export interface Hotel {
  id: string;
  name: string;
  description: string;
  pricePerNightUSD: { min: number; max: number };
  latitude: number;
  longitude: number;
  bookingUrl: string;
  amenities: string[];
  warnings?: string;
  neighborhood: string;
}

// ============ TOURIST TRAP ============

export interface TouristTrap {
  id: string;
  name: string;
  reason: string;
  latitude?: number;
  longitude?: number;
}

// ============ DAY & ITINERARY ============

export type ItineraryItemType = 'ACTIVITY' | 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' | 'EVENING';

export interface MealInfo {
  id: string;
  name: string;
  category: LocationCategory | string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
}

export interface HotelInfo {
  id: string;
  name: string;
  category: LocationCategory | string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
  rating?: number;
  address?: string;
}

export interface DayMeals {
  breakfast: MealInfo | null;
  lunch: MealInfo | null;
  dinner: MealInfo | null;
}

export interface ItineraryDay {
  id: string;
  dayNumber: number;
  theme?: string;
  description?: string;
  routeDescription?: string;
  dailyBudgetUSD?: number;
  locations: Location[];
  meals?: DayMeals;
  hotel?: HotelInfo | null;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  currency: string;
}

export interface Warning {
  id?: string;
  title: string;
  description: string;
  severity?: string;
  category?: string;
}

// ============ API REQUEST/RESPONSE ============

export interface GenerateItineraryRequest {
  country: string;
  airportCode: string;
  numberOfDays: number;
  budgetUSD: number;
  travelStyles?: TravelStyle[];
  budgetLevel?: BudgetLevel;
  flightDate?: string;
}

export interface ItineraryResponse {
  source: 'AI' | 'DATABASE';
  itinerary: {
    id: string;
    numberOfDays: number;
    budgetUSD: number;
    totalEstimatedCostUSD?: number;
    budgetBreakdown?: {
      food: number;
      activities: number;
      transport: number;
      accommodation: number;
    };
  };
  days: ItineraryDay[];
  hotel?: HotelInfo | null;  // Primary hotel for the trip
  hotels?: Hotel[];          // Legacy support
  airport: Airport;
  country?: Country;
  warnings: Warning[];
  touristTraps: TouristTrap[];
  localTips: string[];
  routeSummary?: string;
}

// ============ NEW TYPES FOR ENHANCED FEATURES ============

export interface Place {
  id: string;
  name: string;
  classification: LocationClassification;
  category: LocationCategory | string;
  description: string;
  sources: string[];
  popularity: number;
  rating?: number;
  totalRatings?: number;
  priceLevel?: PriceLevel;
  city: string;
  latitude: number;
  longitude: number;
  activityTypes: string[];
  costMinUSD?: number;
  costMaxUSD?: number;
  localTip?: string;
  scamWarning?: string;
  imageUrl?: string;
  imageUrls?: string[];
  openingHours?: any;
}

export interface ChecklistItem {
  id: string;
  category: 'ESSENTIALS' | 'WEATHER' | 'TERRAIN' | 'ACTIVITY' | 'SAFETY' | 'DOCUMENTATION' | string;
  item: string;
  reason?: string;
  source?: string;
  isChecked: boolean;
}

export interface RAGAction {
  type: 'ADD_PLACE' | 'REPLACE_PLACE' | 'REORDER' | 'SUGGEST_ADD_DB';
  placeId?: string;
  placeName?: string;
  dayNumber?: number;
  order?: number;
  reason: string;
}

export interface RAGResponse {
  answer: string;
  actions?: RAGAction[];
  sources: string[];
  confidence: number;
  staleWarning?: string;
}

export interface PlacesResponse {
  data: Place[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
