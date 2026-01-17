import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';

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

// Fetch all notifications
export const useNotifications = () => {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<Notification[]> => {
      const response = await api.get('/notifications');
      return response.data;
    },
  });
};

// Fetch unread count
export const useUnreadNotificationCount = () => {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async (): Promise<number> => {
      const response = await api.get('/notifications/unread-count');
      return response.data.count;
    },
  });
};

// Mark notification as read
export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await api.put(`/notifications/${notificationId}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
};

// Mark all notifications as read
export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const response = await api.put('/notifications/read-all');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });
};
