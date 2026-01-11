// ============ ENUMS & TYPES ============

export type LocationClassification = 'HIDDEN_GEM' | 'CONDITIONAL' | 'TOURIST_TRAP';
export type CrowdLevel = 'QUIET' | 'MODERATE' | 'BUSY';
export type LocationCategory =
  | 'RESTAURANT' | 'CAFE' | 'BAR' | 'NIGHTCLUB'
  | 'BEACH' | 'HIKING' | 'HISTORICAL_SITE' | 'MUSEUM'
  | 'MARKET' | 'VIEWPOINT' | 'PARK' | 'RELIGIOUS_SITE'
  | 'TEMPLE' | 'SHOPPING' | 'ACTIVITY' | 'OTHER';

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

export interface ItineraryDay {
  id: string;
  dayNumber: number;
  description?: string;
  routeDescription?: string;
  dailyBudgetUSD?: number;
  locations: Location[];
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

export type TravelStyle = 'food' | 'culture' | 'nature' | 'nightlife' | 'adventure';

export interface GenerateItineraryRequest {
  country: string;
  airportCode: string;
  numberOfDays: number;
  budgetUSD: number;
  travelStyles?: TravelStyle[];  // NEW: optional travel styles
  flightDate?: string;           // NEW: ISO date string for notifications
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
  hotels: Hotel[];
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
