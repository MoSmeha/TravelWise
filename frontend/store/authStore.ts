import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isRestoring: boolean; // separate loading state for initial hydration
  
  // Actions
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
  isRestoring: true,

  logout: async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEY_ACCESS);
    await SecureStore.deleteItemAsync(STORAGE_KEY_REFRESH);
    
    set({ 
      user: null, 
      accessToken: null, 
      refreshToken: null, 
      isAuthenticated: false,
    });
  },

  hydrate: async () => {
     set({ isRestoring: true });
     try {
       const accessToken = await SecureStore.getItemAsync(STORAGE_KEY_ACCESS);
       const refreshToken = await SecureStore.getItemAsync(STORAGE_KEY_REFRESH);

       if (accessToken && refreshToken) {
         set({ 
            accessToken, 
            refreshToken,
            isAuthenticated: true // Optimistically set to true, useUser will validate or fail 401
         }); 
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
      set({ accessToken, refreshToken, isAuthenticated: true });
  },

  updateUser: (user) => {
      set({ user });
  }
}));
