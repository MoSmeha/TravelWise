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
    

    handleNewNotification(notification);
    

    // Choose toast variant based on notification type
    let toastType = 'info';
    switch (notification.type) {
      case 'POST_LIKE':
        toastType = 'post_like';
        break;
      case 'POST_COMMENT':
        toastType = 'post_comment';
        break;
      case 'FRIEND_REQUEST':
        toastType = 'friend_request';
        break;
      case 'FRIEND_ACCEPTED':
        toastType = 'friend_accepted';
        break;
      case 'ITINERARY_SHARED':
        toastType = 'itinerary_shared';
        break;
      case 'ITINERARY_ACCEPTED':
        toastType = 'itinerary_accepted';
        break;
    }

    Toast.show({
      type: toastType,
      text1: notification.title,
      text2: notification.message,
    });
  }, [handleNewNotification]);

  const handleNewMessage = useCallback((event: NewMessageEvent) => {
    console.log('[useSocket] Received new message:', event);
    

    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    queryClient.invalidateQueries({ queryKey: ['messages', event.conversationId] });
    

    Toast.show({
      type: 'message',
      text1: event.message.sender?.name || 'New Message',
      text2: event.message.content.length > 50 
        ? event.message.content.substring(0, 47) + '...' 
        : event.message.content,
    });
  }, [queryClient]);


  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('[useSocket] AppState changed:', appState.current, '->', nextAppState);
      

      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('[useSocket] App returned to foreground, forcing socket reconnect');

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

    if (accessToken && !isRestoring && user?.id) {
      console.log('[useSocket] Connecting with token, user:', user.id);

      socketService.connect(accessToken);


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
