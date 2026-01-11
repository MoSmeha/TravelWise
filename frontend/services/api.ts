import axios from 'axios';
import { z } from 'zod';
import { API_BASE_URL } from '../config/api';
import type {
  ChecklistItem,
  CountryConfig,
  GenerateItineraryRequest,
  ItineraryResponse,
  Place,
  PlacesResponse,
  RAGResponse
} from '../types/api';
import {
  ChecklistItemSchema,
  CountryConfigSchema,
  ItineraryResponseSchema,
  RAGResponseSchema
} from '../types/schemas';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach token
api.interceptors.request.use(
  async (config) => {
    // Dynamically import store to avoid circular dependency issues at module level if possible,
    // or just rely on the fact that zustand store is singleton.
    // Better: use direct import if circular deps aren't checking.
    // But since authService imports api, and api imports authStore which imports authService... circular.
    // Solution: Access token from SecureStore directly or via a non-import way? 
    // Or just simple:
    const { useAuth } = require('../store/authStore'); 
    const token = useAuth.getState().accessToken;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const { useAuth } = require('../store/authStore');
        const { refreshToken: rToken, setTokens, logout } = useAuth.getState();
        
        if (!rToken) {
            // No refresh token, just logout
            logout();
            return Promise.reject(error);
        }

        // Call refresh endpoint directly to avoid circular authService calls if it uses api
        // Actually authService uses api... so allow authService.refreshToken to bypass interceptors?
        // Or manually call axios here.
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken: rToken });
        const { token, refreshToken: newRefreshToken } = response.data.data;
        
        setTokens(token, newRefreshToken);
        
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        // Refresh failed
        const { useAuth } = require('../store/authStore');
        useAuth.getState().logout();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const countryService = {
  async getCountries(): Promise<CountryConfig[]> {
    const response = await api.get<{ countries: CountryConfig[] }>('/itinerary/countries');
    const schema = z.object({ countries: z.array(CountryConfigSchema) });
    const parsed = schema.parse(response.data);
    return parsed.countries;
  },
};

export const itineraryService = {
  async generateItinerary(request: GenerateItineraryRequest): Promise<ItineraryResponse> {
    const response = await api.post<ItineraryResponse>('/itinerary/generate', request);
    return ItineraryResponseSchema.parse(response.data);
  },
  
  async askQuestion(itineraryId: string, question: string): Promise<RAGResponse> {
    const response = await api.post<RAGResponse>(`/itinerary/${itineraryId}/ask`, { question });
    return RAGResponseSchema.parse(response.data);
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
  async getChecklist(itineraryId: string): Promise<ChecklistItem[]> {
    const response = await api.get<{ data: ChecklistItem[] }>(`/checklist/${itineraryId}`);
    return z.array(ChecklistItemSchema).parse(response.data.data || []);
  },

  async toggleChecklistItem(itemId: string): Promise<import('../types/api').ChecklistItem> {

    throw new Error("Method signature update needed");
  },

  async updateChecklistItemStatus(itemId: string, isChecked: boolean): Promise<ChecklistItem> {
    const response = await api.patch<{ data: ChecklistItem }>(`/checklist/${itemId}`, { isChecked });
    return ChecklistItemSchema.parse(response.data.data);
  },

  async addChecklistItem(itineraryId: string, item: string, category: string = 'ESSENTIALS'): Promise<ChecklistItem> {
    const response = await api.post<{ data: ChecklistItem }>(`/checklist/${itineraryId}`, { 
      item, 
      category,
      reason: 'User added item'
    });
    return ChecklistItemSchema.parse(response.data.data);
  },
};

export default api;

