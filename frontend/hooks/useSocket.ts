import { useEffect } from 'react';
import { useAuth } from '../store/authStore';
import { socketService } from '../services/socketService';
import { useNotificationStore, Notification } from '../store/notificationStore';
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

  useEffect(() => {
    // Only connect socket after hydration is complete to ensure fresh token
    if (accessToken && !isRestoring) {
      console.log('[useSocket] Connecting with token, user:', user?.id || 'not yet loaded');
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
  }, [accessToken, isRestoring, handleNotification, handleNewMessage]);

  return socketService;
};
