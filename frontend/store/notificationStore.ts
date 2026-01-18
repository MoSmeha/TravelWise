import { create } from 'zustand';
import { queryClient } from '../lib/react-query';

// Minimal Zustand store for real-time socket notifications only
// Data fetching is handled by React Query hooks in hooks/queries/useNotifications.ts

export interface Notification {
  id: string;
  userId: string;
  type: 'FRIEND_REQUEST' | 'FRIEND_ACCEPTED';
  title: string;
  message: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: string;
}

interface NotificationSocketState {
  // Real-time notifications that just arrived (for toasts, etc.)
  latestNotification: Notification | null;
  
  // Actions
  handleNewNotification: (notification: Notification) => void;
  clearLatestNotification: () => void;
}

export const useNotificationStore = create<NotificationSocketState>((set) => ({
  latestNotification: null,

  handleNewNotification: (notification) => {
    set({ latestNotification: notification });
    
    // Invalidate React Query caches to refetch updated data
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    
    // Also invalidate friends queries if it's a friend-related notification
    if (notification.type === 'FRIEND_REQUEST') {
      queryClient.invalidateQueries({ queryKey: ['friends', 'pending'] });
    } else if (notification.type === 'FRIEND_ACCEPTED') {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    }
  },
  
  clearLatestNotification: () => set({ latestNotification: null }),
}));
