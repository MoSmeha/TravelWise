import axios from 'axios';
import { API_BASE_URL } from '../config/api';
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
          await new Promise<void>((resolve) => {
            // Check if already done
            if (!useAuth.getState().isRestoring) {
              resolve();
              return;
            }
            // Otherwise subscribe and wait for change
            const unsubscribe = useAuth.subscribe(
              (state) => state.isRestoring,
              (stillRestoring) => {
                if (!stillRestoring) {
                  unsubscribe();
                  resolve();
                }
              }
            );
          });
          // Re-fetch state after hydration
          const state = useAuth.getState();
          rToken = state.refreshToken;
          console.log('[Auth] Hydration complete, hasRefreshToken:', !!rToken);
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

export default api;
