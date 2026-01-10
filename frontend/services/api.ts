import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import type {
  CountryConfig,
  GenerateItineraryRequest,
  ItineraryResponse,
  Place,
  PlacesResponse,
  RAGResponse
} from '../types/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 120 seconds for complex AI generation
  headers: {
    'Content-Type': 'application/json',
  },
});

export const countryService = {
  async getCountries(): Promise<CountryConfig[]> {
    const response = await api.get<{ countries: CountryConfig[] }>('/itinerary/countries');
    return response.data.countries;
  },
};

export const itineraryService = {
  async generateItinerary(request: GenerateItineraryRequest): Promise<ItineraryResponse> {
    const response = await api.post<ItineraryResponse>('/itinerary/generate', request);
    return response.data;
  },
  
  async askQuestion(itineraryId: string, question: string): Promise<RAGResponse> {
    const response = await api.post<RAGResponse>(`/itinerary/${itineraryId}/ask`, { question });
    return response.data;
  },
};

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
    return response.data;
  },
  
  async getPlace(id: string): Promise<Place> {
    const response = await api.get<{ data: Place }>(`/places/${id}`);
    return response.data.data;
  },
  
  async getCities(): Promise<{ name: string; placeCount: number }[]> {
    const response = await api.get<{ data: { name: string; placeCount: number }[] }>('/places/meta/cities');
    return response.data.data;
  },

  async getPlacePhotos(name: string, lat?: number, lng?: number): Promise<{ photos: string[]; reviews: any[] }> {
    const params = { name, lat, lng };
    const response = await api.get<{ photos: string[]; reviews: any[] }>('/places/photos', { params });
    return response.data;
  },
};

export const checklistService = {
  async getChecklist(itineraryId: string): Promise<import('../types/api').ChecklistItem[]> {
    const response = await api.get<{ data: import('../types/api').ChecklistItem[] }>(`/checklist/${itineraryId}`);
    return response.data.data || [];
  },

  async toggleChecklistItem(itemId: string): Promise<import('../types/api').ChecklistItem> {

    throw new Error("Method signature update needed");
  },

  async updateChecklistItemStatus(itemId: string, isChecked: boolean): Promise<import('../types/api').ChecklistItem> {
    const response = await api.patch<{ data: import('../types/api').ChecklistItem }>(`/checklist/${itemId}`, { isChecked });
    return response.data.data;
  },

  async addChecklistItem(itineraryId: string, item: string, category: string = 'ESSENTIALS'): Promise<import('../types/api').ChecklistItem> {
    const response = await api.post<{ data: import('../types/api').ChecklistItem }>(`/checklist/${itineraryId}`, { 
      item, 
      category,
      reason: 'User added item'
    });
    return response.data.data;
  },
};

export default api;

