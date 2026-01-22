import { create } from 'zustand';
import { deleteItemAsync, getItemAsync, setItemAsync } from 'expo-secure-store';
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
    console.log('[AUTH] Logout called');
    await deleteItemAsync(STORAGE_KEY_ACCESS);
    await deleteItemAsync(STORAGE_KEY_REFRESH);
    
    // Clear React Query cache to prevent stale data
    const { queryClient } = require('../lib/react-query');
    queryClient.clear();
    console.log('[AUTH] Cleared tokens and query cache');
    
    set({ 
      user: null, 
      accessToken: null, 
      refreshToken: null, 
      isAuthenticated: false,
    });
    console.log('[AUTH] Set isAuthenticated=false');
  },

  hydrate: async () => {
     console.log('[AUTH] Hydrating...');
     set({ isRestoring: true });
     try {
       const accessToken = await getItemAsync(STORAGE_KEY_ACCESS);
       const refreshToken = await getItemAsync(STORAGE_KEY_REFRESH);
       console.log('[AUTH] Found tokens:', { hasAccess: !!accessToken, hasRefresh: !!refreshToken });

       if (accessToken && refreshToken) {
         set({ 
            accessToken, 
            refreshToken,
            isAuthenticated: true
         });
         console.log('[AUTH] Set isAuthenticated=true');
       } else {
         console.log('[AUTH] No tokens found, staying unauthenticated');
       }
     } catch (error) {
       console.error('[AUTH] Hydration failed:', error);
     } finally {
       set({ isRestoring: false });
       console.log('[AUTH] Hydration complete, isRestoring=false');
     }
  },
  
  setTokens: (accessToken, refreshToken) => {
      setItemAsync(STORAGE_KEY_ACCESS, accessToken);
      setItemAsync(STORAGE_KEY_REFRESH, refreshToken);
      set({ accessToken, refreshToken, isAuthenticated: true });
  },

  updateUser: (user) => {
      set({ user });
  }
}));
