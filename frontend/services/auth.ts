import api from './api';
import { RegisterInput, LoginInput, VerifyEmailInput, ResendVerificationInput } from '../types/auth';
import { 
  AuthResponseSchema, 
  RegisterResponseSchema, 
  AuthMessageResponseSchema, 
  UserSchema,
  RefreshTokenResponseSchema,
  AuthResponse,
  RegisterResponse,
  User
} from '../types/schemas';

export const authService = {
  async register(data: RegisterInput): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>('/auth/register', data);
    return RegisterResponseSchema.parse(response.data);
  },

  async login(data: LoginInput): Promise<AuthResponse> {
    const response = await api.post<{ user: AuthResponse['user']; accessToken: string; refreshToken: string }>('/auth/login', data);
    const transformed = {
      user: response.data.user,
      token: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    };
    return AuthResponseSchema.parse(transformed);
  },

  async verifyEmail(data: VerifyEmailInput): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/verify-email', data);
    return AuthMessageResponseSchema.parse(response.data);
  },

  async resendVerification(data: ResendVerificationInput): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/resend-verification', data);
    return AuthMessageResponseSchema.parse(response.data);
  },

  async logout(): Promise<void> {
  },

  async getMe(): Promise<User> {
    const response = await api.get<{ user: User }>('/auth/me');
    return UserSchema.parse(response.data.user);
  },
  
  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
      const response = await api.post<{ data: { token: string; refreshToken: string } }>('/auth/refresh', { refreshToken });
      return RefreshTokenResponseSchema.parse(response.data.data);
  }
};
