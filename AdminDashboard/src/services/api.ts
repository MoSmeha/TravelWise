/**
 * API Service
 * Handles all HTTP requests to the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiService {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{
      accessToken: string;
      refreshToken: string;
      user: {
        id: string;
        email: string;
        name: string;
        isAdmin?: boolean;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Admin Stats
  async getOverviewStats() {
    return this.request<{
      totalUsers: number;
      totalItineraries: number;
      totalPosts: number;
      totalFriendships: number;
      newUsersLast7Days: number;
      newUsersLast30Days: number;
      verifiedUsers: number;
      unverifiedUsers: number;
    }>('/admin/stats/overview');
  }

  async getItineraryStats() {
    return this.request<{
      byCountry: { country: string; count: number }[];
      byTravelStyle: { style: string; count: number }[];
      budgetDistribution: { range: string; count: number }[];
    }>('/admin/stats/itineraries');
  }

  async getUserStats(days: number = 30) {
    return this.request<{
      growth: { date: string; count: number }[];
    }>(`/admin/stats/users?days=${days}`);
  }

  async getCategoryStats() {
    return this.request<{
      categories: { category: string; count: number }[];
    }>('/admin/stats/categories');
  }

  async getEngagementStats() {
    return this.request<{
      totalLikes: number;
      totalComments: number;
      notificationsByType: { type: string; count: number }[];
    }>('/admin/stats/engagement');
  }

  async getUsers(page: number = 1, pageSize: number = 20, search?: string) {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    if (search) params.append('search', search);

    return this.request<{
      users: {
        id: string;
        email: string;
        name: string;
        username: string;
        avatarUrl: string;
        emailVerified: boolean;
        isAdmin: boolean;
        createdAt: string;
        itineraryCount: number;
        postCount: number;
      }[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`/admin/users?${params.toString()}`);
  }
}

export const api = new ApiService();
