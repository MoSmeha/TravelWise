import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../store/authStore';
import { socketService } from '../services/socketService';
import { useNotificationStore } from '../store/notificationStore';
import { Notification } from './queries/useNotifications';
import Toast from 'react-native-toast-message';
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Message } from './queries/useMessages';

interface NewMessageEvent {
  conversationId: string;
  message: Message;
}

export const useSocket = () => {
  const { accessToken, user, isRestoring } = useAuth();
  const { handleNewNotification } = useNotificationStore();
  const queryClient = useQueryClient();
  const appState = useRef(AppState.currentState);

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

  const handleNewMessage = useCallback((event: NewMessageEvent) => {
    console.log('[useSocket] Received new message:', event);
    
    // Invalidate relevant caches
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    queryClient.invalidateQueries({ queryKey: ['messages', event.conversationId] });
    
    // Show toast notification
    Toast.show({
      type: 'info',
      text1: event.message.sender?.name || 'New Message',
      text2: event.message.content.length > 50 
        ? event.message.content.substring(0, 47) + '...' 
        : event.message.content,
    });
  }, [queryClient]);

  // Handle app state changes (background/foreground)
  // This fixes socket reconnection when returning from camera/photo picker
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('[useSocket] AppState changed:', appState.current, '->', nextAppState);
      
      // App returned to foreground from background/inactive
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[useSocket] App returned to foreground, forcing socket reconnect');
        // Force socket reconnection if we have auth
        if (accessToken && user?.id) {
          socketService.forceReconnect(accessToken);
        }
      }
      
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [accessToken, user?.id]);

  useEffect(() => {
    // Only connect socket after hydration is complete AND user data is loaded
    // This prevents race conditions where socket connects before auth is fully ready
    if (accessToken && !isRestoring && user?.id) {
      console.log('[useSocket] Connecting with token, user:', user.id);
      // Connect socket
      socketService.connect(accessToken);

      // Subscribe to events
      socketService.on('notification:new', handleNotification);
      socketService.on('message:new', handleNewMessage);
    } else if (!accessToken) {
      socketService.disconnect();
    }

    return () => {
      if (accessToken) {
        console.log('[useSocket] Cleaning up listeners');
        socketService.off('notification:new', handleNotification);
        socketService.off('message:new', handleNewMessage);
      }
    };
  }, [accessToken, isRestoring, user?.id, handleNotification, handleNewMessage]);

  return socketService;
};
