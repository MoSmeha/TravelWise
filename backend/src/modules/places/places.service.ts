

import { placesProvider } from './places.provider.js';
import {
  IPlacesProvider,
  PlaceFilters,
  PlaceRecord,
  PaginatedPlaces,
  CityCount,
  CategoryCount,
  PlaceEnrichmentData,
} from './places.contract.js';
import {
  isGooglePlacesConfigured,
  searchPlace as googleSearchPlace,
  getPlaceDetails as googleGetDetails,
  getDirections as googleGetDirections,
  PlaceEnrichment
} from './google-places.service.js';
import { extractCityFromAddress } from '../shared/utils/enum-mappers.js';
import { mapGooglePriceLevel } from '../shared/utils/prisma-helpers.js';



const CACHE_FRESHNESS_DAYS = 7;



export interface PhotosAndReviews {
  photos: string[];
  reviews: { author: string; rating: number; text: string; time: string }[];
}

export interface SearchPlaceResult {
  place: PlaceRecord | null;
  source: 'db' | 'google_ingest';
  message?: string;
}



export class PlacesService {
  constructor(private provider: IPlacesProvider = placesProvider) {}




  async getPlaceById(id: string): Promise<PlaceRecord | null> {
    return this.provider.findById(id);
  }


  async listPlaces(filters: PlaceFilters): Promise<PaginatedPlaces> {
    return this.provider.findMany({
      ...filters,
      limit: filters.limit || 50,
      offset: filters.offset || 0,
    });
  }


  async getCities(): Promise<CityCount[]> {
    return this.provider.groupByCity();
  }


  async getCategories(): Promise<CategoryCount[]> {
    return this.provider.groupByCategory();
  }




  async searchPlace(name: string, lat?: number, lng?: number): Promise<SearchPlaceResult> {

    const existingPlace = await this.provider.findByName(name);

    if (existingPlace) {
      console.log(`Found ${name} in DB.`);
      return { place: existingPlace, source: 'db' };
    }


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


    const existingByGoogleId = await this.provider.findByGooglePlaceId(details.googlePlaceId);

    if (existingByGoogleId) {
      console.log(`Found ${name} in DB by Google ID.`);
      return { place: existingByGoogleId, source: 'db' };
    }


    const city = extractCityFromAddress(details.formattedAddress || '');

    const topReviews = details.topReviews.map(r => ({
      author: r.authorName,
      rating: r.rating,
      text: r.text,
      time: r.relativeTimeDescription,
    }));


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




  async getPhotosAndReviews(
    name: string,
    id?: string,
    lat?: number,
    lng?: number
  ): Promise<PhotosAndReviews> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - CACHE_FRESHNESS_DAYS);


    let existingPlace: PlaceRecord | null = null;

    if (id) {
      existingPlace = await this.provider.findById(id);
    }

    if (!existingPlace) {
      existingPlace = await this.provider.findByName(name);
    }


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


    if (!isGooglePlacesConfigured()) {
      return { photos: [], reviews: [] };
    }

    let googleData: PlaceEnrichment | null = null;

    if (existingPlace && existingPlace.googlePlaceId) {

      const result = await googleGetDetails(existingPlace.googlePlaceId);
      googleData = result.data;
    } else {

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


  async updatePlaceEnrichment(id: string, data: PlaceEnrichmentData): Promise<void> {
    return this.provider.updateEnrichment(id, data);
  }


  async getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    waypoints: { lat: number; lng: number }[] = []
  ): Promise<{ points: string } | null> {
    const originStr = `${origin.lat},${origin.lng}`;
    const destStr = `${destination.lat},${destination.lng}`;
    const waypointsStr = waypoints.map(p => `${p.lat},${p.lng}`);

    const result = await googleGetDirections(originStr, destStr, waypointsStr);
    
    if (result) {
      return { points: result.points };
    }
    
    return null;
  }
}


export const placesService = new PlacesService();
