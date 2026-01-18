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

// Token refresh state to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Response interceptor: Handle 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject: (err: unknown) => {
              reject(err);
            }
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        const { useAuth } = require('../store/authStore');
        let { refreshToken: rToken, isRestoring, setTokens, logout } = useAuth.getState();
        
        // If still hydrating, wait for it to complete (max 3 seconds)
        if (isRestoring) {
          console.log('[Auth] Waiting for hydration to complete...');
          let waitCount = 0;
          while (isRestoring && waitCount < 6) {
            await new Promise(resolve => setTimeout(resolve, 500));
            const state = useAuth.getState();
            isRestoring = state.isRestoring;
            rToken = state.refreshToken;
            waitCount++;
          }
          console.log('[Auth] Hydration wait complete, hasRefreshToken:', !!rToken);
        }
        
        if (!rToken) {
          // No refresh token, just logout
          console.log('[Auth] No refresh token available, logging out');
          await logout();
          processQueue(error, null);
          return Promise.reject(error);
        }

        // Call refresh endpoint directly with axios (not the intercepted api)
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken: rToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        setTokens(accessToken, newRefreshToken);
        processQueue(null, accessToken);
        
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
        
      } catch (refreshError: unknown) {
        // Refresh failed - could be network error, invalid token, or server error
        console.log('[Auth] Token refresh failed, logging out:', 
          refreshError instanceof Error ? refreshError.message : 'Unknown error'
        );
        
        const { useAuth } = require('../store/authStore');
        await useAuth.getState().logout();
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
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

  async getPlacePhotos(name: string, lat?: number, lng?: number, id?: string): Promise<{ photos: string[]; reviews: any[] }> {
    const params = { name, lat, lng, id };
    const response = await api.get<{ photos: string[]; reviews: any[] }>('/places/photos', { params });
    return response.data;
  },
};

export const checklistService = {
  async getChecklist(itineraryId: string): Promise<ChecklistItem[]> {
    const response = await api.get<{ data: ChecklistItem[] }>(`/checklist/${itineraryId}`);
    return z.array(ChecklistItemSchema).parse(response.data.data || []);
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

