import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import api from '../../services/api-client';
import { useAuth } from '../../store/authStore';
import { socketService } from '../../services/socketService';


export const useOnlineStatus = (userIds: string[]) => {
  const { isAuthenticated, isRestoring } = useAuth();
  const queryClient = useQueryClient();
  
  // Listen for real-time online/offline events
  useEffect(() => {
    const handleUserOnline = (data: { userId: string }) => {
      console.log('[useOnlineStatus] User came online:', data.userId);
      // Update cache for all matching query keys
      queryClient.setQueriesData<Record<string, boolean>>(
        { queryKey: ['users', 'online-status'] },
        (oldData) => {
          if (!oldData) return oldData;
          return { ...oldData, [data.userId]: true };
        }
      );
    };

    const handleUserOffline = (data: { userId: string }) => {
      console.log('[useOnlineStatus] User went offline:', data.userId);
      // Update cache for all matching query keys
      queryClient.setQueriesData<Record<string, boolean>>(
        { queryKey: ['users', 'online-status'] },
        (oldData) => {
          if (!oldData) return oldData;
          return { ...oldData, [data.userId]: false };
        }
      );
    };

    socketService.on('user:online', handleUserOnline);
    socketService.on('user:offline', handleUserOffline);

    return () => {
      socketService.off('user:online', handleUserOnline);
      socketService.off('user:offline', handleUserOffline);
    };
  }, [queryClient]);
  
  return useQuery({
    queryKey: ['users', 'online-status', userIds.sort().join(',')],
    queryFn: async (): Promise<Record<string, boolean>> => {
      if (userIds.length === 0) return {};
      
      const response = await api.get('/users/online-status', {
        params: { userIds: userIds.join(',') }
      });
      return response.data;
    },
    enabled: isAuthenticated && !isRestoring && userIds.length > 0,


  });
};
