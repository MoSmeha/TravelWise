import { useEffect } from 'react';
import { useAuth } from '../store/authStore';
import { socketService } from '../services/socketService';
import { useNotificationStore, Notification } from '../store/notificationStore';
import Toast from 'react-native-toast-message';

export const useSocket = () => {
  const { accessToken, user } = useAuth();
  const { handleNewNotification } = useNotificationStore();

  useEffect(() => {
    if (accessToken && user) {
      // Connect socket
      socketService.connect(accessToken);

      // Subscribe to events
      socketService.on('notification:new', (notification: Notification) => {
        // Handle in store (invalidates React Query caches)
        handleNewNotification(notification);
        
        // Show local notification/toast
        Toast.show({
          type: 'info',
          text1: notification.title,
          text2: notification.message,
        });
      });
    } else {
      socketService.disconnect();
    }

    return () => {
      socketService.off('notification:new', () => {});
    };
  }, [accessToken, user, handleNewNotification]);

  return socketService;
};
