import { create } from 'zustand';
import { queryClient } from '../lib/react-query';
import { Notification } from '../hooks/queries/useNotifications';

// Minimal Zustand store for real-time socket notifications only
// Data fetching is handled by React Query hooks in hooks/queries/useNotifications.ts

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
    
    // Also invalidate related queries based on notification type
    if (notification.type === 'FRIEND_REQUEST') {
      queryClient.invalidateQueries({ queryKey: ['friends', 'pending'] });
    } else if (notification.type === 'FRIEND_ACCEPTED') {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    } else if (notification.type === 'ITINERARY_SHARED' || notification.type === 'ITINERARY_ACCEPTED') {
      queryClient.invalidateQueries({ queryKey: ['shared-itineraries'] });
      queryClient.invalidateQueries({ queryKey: ['user-itineraries'] });
    }
  },
  
  clearLatestNotification: () => set({ latestNotification: null }),
}));
