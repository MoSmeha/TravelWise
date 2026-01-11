import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User, LoginInput, RegisterInput, AuthResponse, RegisterResponse } from '../types/auth';
import { authService } from '../services/auth';
import { router } from 'expo-router';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRestoring: boolean; // separate loading state for initial hydration
  
  // Actions
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>; // Restore session
  setTokens: (accessToken: string, refreshToken: string) => void;
  updateUser: (user: User) => void;
}

const STORAGE_KEY_ACCESS = 'auth_access_token';
const STORAGE_KEY_REFRESH = 'auth_refresh_token';

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  isRestoring: true,

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const data = await authService.login(credentials);
      await SecureStore.setItemAsync(STORAGE_KEY_ACCESS, data.token);
      await SecureStore.setItemAsync(STORAGE_KEY_REFRESH, data.refreshToken);
      set({ 
        user: data.user, 
        accessToken: data.token, 
        refreshToken: data.refreshToken, 
        isAuthenticated: true 
      });
      // Navigation should be handled by the component or a listener, but we can hint it here
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const response = await authService.register(data);
      // Registration does NOT auto-login - user must verify email first
      // The response contains { message, user } but no tokens
      // Store user temporarily for the verification flow
      set({ 
        user: response.user, 
        isAuthenticated: false  // Not authenticated until email verified and logged in
      });
      return response; // Return response so component can handle navigation
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
        await authService.logout();
    } catch (e) {
        console.error("Logout backend call failed", e);
    }
    
    await SecureStore.deleteItemAsync(STORAGE_KEY_ACCESS);
    await SecureStore.deleteItemAsync(STORAGE_KEY_REFRESH);
    
    set({ 
      user: null, 
      accessToken: null, 
      refreshToken: null, 
      isAuthenticated: false,
      isLoading: false
    });
    router.replace('/auth/login' as any);
  },

  hydrate: async () => {
     set({ isRestoring: true });
     try {
       const accessToken = await SecureStore.getItemAsync(STORAGE_KEY_ACCESS);
       const refreshToken = await SecureStore.getItemAsync(STORAGE_KEY_REFRESH);

       if (accessToken && refreshToken) {
         // Optionally verify token with backend or just assume valid until 401
         // Better: Fetch user profile to validate
         set({ accessToken, refreshToken }); // Set tokens temporarily to allow api calls
         
         try {
             const user = await authService.getMe();
             set({ user, isAuthenticated: true, accessToken, refreshToken });
         } catch (error) {
             console.log("Token invalid, attempting refresh or logout");
             // If getMe fails, we might try to refresh or just logout
             // For now, let's assume if getMe fails, we are logged out.
             // But real app might try refresh here.
             // We will rely on Axios interceptor for refresh.
             
             // If refreshing is handled by axios, getMe might succeed after refresh.
             // If it completely fails:
             set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
         }
       }
     } catch (error) {
       console.error('Hydration failed:', error);
     } finally {
       set({ isRestoring: false });
     }
  },
  
  setTokens: (accessToken, refreshToken) => {
      SecureStore.setItemAsync(STORAGE_KEY_ACCESS, accessToken);
      SecureStore.setItemAsync(STORAGE_KEY_REFRESH, refreshToken);
      set({ accessToken, refreshToken });
  },

  updateUser: (user) => {
      set({ user });
  }
}));
