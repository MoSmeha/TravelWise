import api from './api-client';
import type { Place, PlaceReview, PlacesResponse } from '../types/api';
import { PlacesResponseSchema, PlaceSchema } from '../types/schemas';

export const placesService = {
  async getPlaces(params?: {
    city?: string;
    category?: string;
    activityType?: string;
    classification?: string;
    limit?: number;
    offset?: number;
  }): Promise<PlacesResponse> {
    const response = await api.get<PlacesResponse>('/places', { params });
    return PlacesResponseSchema.parse(response.data);
  },
  
  async getPlace(id: string): Promise<Place> {
    const response = await api.get<{ data: Place }>(`/places/${id}`);
    return PlaceSchema.parse(response.data.data);
  },
  
  async getCities(): Promise<{ name: string; placeCount: number }[]> {
    const response = await api.get<{ data: { name: string; placeCount: number }[] }>('/places/meta/cities');
    return response.data.data;
  },

  async getPlacePhotos(name: string, lat?: number, lng?: number, id?: string): Promise<{ photos: string[]; reviews: PlaceReview[] }> {
    const params = { name, lat, lng, id };
    const response = await api.get<{ photos: string[]; reviews: PlaceReview[] }>('/places/photos', { params });
    return response.data;
  },

  async getDirections(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    waypoints: { lat: number; lng: number }[] = []
  ): Promise<{ points: string } | null> {
    const params = {
      originLat,
      originLng,
      destLat,
      destLng,
      waypoints: JSON.stringify(waypoints),
    };
    const response = await api.get<{ points: string | null }>('/places/directions', { params });
    return response.data as { points: string } | null;
  },
};
