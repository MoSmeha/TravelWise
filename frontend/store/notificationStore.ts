import { create } from 'zustand';
import { queryClient } from '../lib/react-query';
import { Notification } from '../hooks/queries/useNotifications';



interface NotificationSocketState {

  latestNotification: Notification | null;
  

  handleNewNotification: (notification: Notification) => void;
  clearLatestNotification: () => void;
}

export const useNotificationStore = create<NotificationSocketState>((set) => ({
  latestNotification: null,

  handleNewNotification: (notification) => {
    set({ latestNotification: notification });
    

    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    

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
