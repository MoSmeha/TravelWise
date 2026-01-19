
import { LocationCategory, LocationClassification, ItineraryItemType, ChecklistCategory, PriceLevel } from '../generated/prisma/client.js';


export interface FetchPlacesParams {
  categories: LocationCategory[];
  country: string;
  city: string | null;
  limit: number;
  excludeIds?: string[];
  priceLevel?: PriceLevel;
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

export interface CreateExternalHotelData {
  googlePlaceId: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  city?: string;
  address?: string;
  description?: string;
  rating?: number | null;
  totalRatings?: number | null;
  priceLevel?: PriceLevel | null;
  imageUrl?: string | null;
  imageUrls?: string[];
  websiteUrl?: string | null;
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
  [key: string]: any;
}

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


export interface IItineraryProvider {
  
  fetchPlaces(params: FetchPlacesParams): Promise<PlaceRecord[]>;
  
  findPlaceByGoogleId(googlePlaceId: string): Promise<{ id: string } | null>;
  
  updatePlaceEnrichment(placeId: string, data: UpdatePlaceEnrichmentData): Promise<void>;

  
  createItinerary(data: CreateItineraryData): Promise<CreatedItinerary>;
  
  findItineraryById(id: string): Promise<UserItineraryWithDays | null>;
  
  findUserItineraries(userId: string): Promise<UserItinerarySummary[]>;

  
  createItineraryDay(data: CreateItineraryDayData): Promise<ItineraryDayRecord>;
  
  createItineraryItem(data: CreateItineraryItemData): Promise<{ id: string }>;
  
  createChecklistItem(data: CreateChecklistItemData): Promise<{ id: string }>;
  
  createExternalHotel(data: CreateExternalHotelData): Promise<{ id: string }>;
}
