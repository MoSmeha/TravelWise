
import { LocationCategory, LocationClassification, PriceLevel } from '../../generated/prisma/client.js';


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


export interface IPlacesProvider {
  
  findByName(name: string): Promise<PlaceRecord | null>;

  
  findById(id: string): Promise<PlaceRecord | null>;

  
  findMany(filters: PlaceFilters): Promise<PaginatedPlaces>;

  findByGooglePlaceId(googlePlaceId: string): Promise<PlaceRecord | null>;
  
  groupByCity(): Promise<CityCount[]>;
  
  groupByCategory(): Promise<CategoryCount[]>;


  create(data: CreatePlaceData): Promise<PlaceRecord>;

  
  updateEnrichment(id: string, data: PlaceEnrichmentData): Promise<void>;
}
