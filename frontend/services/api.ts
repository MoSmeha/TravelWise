import axios from 'axios';
import { z } from 'zod';
import { API_BASE_URL } from '../config/api';
import type {
  ChecklistItem,
  CountryConfig,
  GenerateItineraryRequest,
  ItineraryResponse,
  Place,
  PlaceReview,
  PlacesResponse,
  RAGResponse
} from '../types/api';
import type { Post, Comment, PaginatedResponse, PostVisibility } from '../types/post';
import {
  ChecklistItemSchema,
  CountryConfigSchema,
  ItineraryResponseSchema,
  RAGResponseSchema,
  PlacesResponseSchema,
  PlaceSchema,
  PostSchema,
  CommentSchema,
  PaginatedPostResponseSchema,
  PaginatedCommentResponseSchema
} from '../types/schemas';

import { useAuth } from '../store/authStore';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});


api.interceptors.request.use(
  async (config) => {
    const token = useAuth.getState().accessToken;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);


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


api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      

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
        let { refreshToken: rToken, isRestoring, setTokens, logout } = useAuth.getState();
        
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
          console.log('[Auth] No refresh token available, logging out');
          await logout();
          processQueue(error, null);
          return Promise.reject(error);
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken: rToken });
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        setTokens(accessToken, newRefreshToken);
        processQueue(null, accessToken);
        
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
        
      } catch (refreshError: unknown) {
        console.log('[Auth] Token refresh failed, logging out:', 
          refreshError instanceof Error ? refreshError.message : 'Unknown error'
        );
        
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

  async deleteChecklistItem(itemId: string): Promise<void> {
    await api.delete(`/checklist/${itemId}`);
  },

  async deleteAllChecklistItems(itineraryId: string): Promise<{ deleted: number }> {
    const response = await api.delete<{ success: boolean; deleted: number }>(`/checklist/all/${itineraryId}`);
    return { deleted: response.data.deleted };
  },
};


export const postService = {
  async getFeed(cursor?: string, limit: number = 10): Promise<PaginatedResponse<Post>> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());
    const response = await api.get<PaginatedResponse<Post>>(`/posts/feed?${params}`);
    return PaginatedPostResponseSchema.parse(response.data);
  },

  async getDiscoverFeed(cursor?: string, limit: number = 10): Promise<PaginatedResponse<Post>> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());
    const response = await api.get<PaginatedResponse<Post>>(`/posts/discover?${params}`);
    return PaginatedPostResponseSchema.parse(response.data);
  },

  async getUserPosts(userId: string, cursor?: string, limit: number = 10): Promise<PaginatedResponse<Post>> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());
    const response = await api.get<PaginatedResponse<Post>>(`/posts/user/${userId}?${params}`);
    return PaginatedPostResponseSchema.parse(response.data);
  },

  async getPost(postId: string): Promise<Post> {
    const response = await api.get<{ data: Post }>(`/posts/${postId}`);
    return PostSchema.parse(response.data.data);
  },

  async createPost(imageUri: string, description?: string, visibility: PostVisibility = 'FRIENDS'): Promise<Post> {
    const formData = new FormData();
    
    const fileName = imageUri.split('/').pop() || 'image.jpg';
    const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    formData.append('image', {
      uri: imageUri,
      name: fileName,
      type: fileType,
    } as any);
    
    if (description) {
      formData.append('description', description);
    }
    formData.append('visibility', visibility);

    const response = await api.post<{ data: Post }>('/posts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return PostSchema.parse(response.data.data);
  },

  async deletePost(postId: string): Promise<void> {
    await api.delete(`/posts/${postId}`);
  },

  async likePost(postId: string): Promise<void> {
    await api.post(`/posts/${postId}/like`);
  },

  async unlikePost(postId: string): Promise<void> {
    await api.delete(`/posts/${postId}/like`);
  },

  async getPostComments(postId: string, cursor?: string, limit: number = 20): Promise<PaginatedResponse<Comment>> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());
    const response = await api.get<PaginatedResponse<Comment>>(`/posts/${postId}/comments?${params}`);
    return PaginatedCommentResponseSchema.parse(response.data);
  },

  async addComment(postId: string, content: string): Promise<Comment> {
    const response = await api.post<{ data: Comment }>(`/posts/${postId}/comments`, { content });
    return CommentSchema.parse(response.data.data);
  },

  async deleteComment(postId: string, commentId: string): Promise<void> {
    await api.delete(`/posts/${postId}/comments/${commentId}`);
  },
};

export const userService = {
  async updateAvatar(imageUri: string): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    
    const fileName = imageUri.split('/').pop() || 'avatar.jpg';
    const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    formData.append('avatar', {
      uri: imageUri,
      name: fileName,
      type: fileType,
    } as any);

    const response = await api.put<{ avatarUrl: string }>('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default api;
