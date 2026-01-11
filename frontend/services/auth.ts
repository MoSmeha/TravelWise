import api from './api';
import { RegisterInput, LoginInput, AuthResponse, RegisterResponse, VerifyEmailInput, ResendVerificationInput, User } from '../types/auth';

export const authService = {
  async register(data: RegisterInput): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>('/auth/register', data);
    return response.data;
  },

  async login(data: LoginInput): Promise<AuthResponse> {
    const response = await api.post<{ user: AuthResponse['user']; accessToken: string; refreshToken: string }>('/auth/login', data);
    // Backend uses 'accessToken' but we rename to 'token' for consistency
    return {
      user: response.data.user,
      token: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    };
  },

  async verifyEmail(data: VerifyEmailInput): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/verify-email', data);
    return response.data;
  },

  async resendVerification(data: ResendVerificationInput): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/resend-verification', data);
    return response.data;
  },

  async logout(): Promise<void> {
    // Optional: Call backend to invalidate refresh token if endpoint exists
    // await api.post('/auth/logout');
  },

  async getMe(): Promise<User> {
    const response = await api.get<{ user: User }>('/auth/me');
    return response.data.user;
  },
  
  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
      const response = await api.post<{ data: { token: string; refreshToken: string } }>('/auth/refresh', { refreshToken });
      return response.data.data;
  }
};
