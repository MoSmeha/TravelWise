import { useEffect } from 'react';
import { useAuth } from '../store/authStore';
import { socketService } from '../services/socketService';
import { useNotificationStore, Notification } from '../store/notificationStore';
import Toast from 'react-native-toast-message';
import { useCallback } from 'react';

export const useSocket = () => {
  const { accessToken, user } = useAuth();
  const { handleNewNotification } = useNotificationStore();

  const handleNotification = useCallback((notification: Notification) => {
    console.log('[useSocket] Received notification:', notification);
    
    // Handle in store (invalidates React Query caches)
    handleNewNotification(notification);
    
    // Show local notification/toast
    Toast.show({
      type: 'info',
      text1: notification.title,
      text2: notification.message,
    });
  }, [handleNewNotification]);

  useEffect(() => {
    // Connect socket when accessToken is available (don't wait for user object)
    // The backend extracts userId from the token, so we don't need user here
    if (accessToken) {
      console.log('[useSocket] Connecting with token, user:', user?.id || 'not yet loaded');
      // Connect socket
      socketService.connect(accessToken);

      // Subscribe to events
      socketService.on('notification:new', handleNotification);
    } else {
      socketService.disconnect();
    }

    return () => {
      if (accessToken) {
        console.log('[useSocket] Cleaning up listeners');
        socketService.off('notification:new', handleNotification);
      }
    };
  }, [accessToken, handleNotification]); // Removed user dependency

  return socketService;
};
