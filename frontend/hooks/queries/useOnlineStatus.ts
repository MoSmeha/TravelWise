import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../store/authStore';


export const useOnlineStatus = (userIds: string[]) => {
  const { isAuthenticated, isRestoring } = useAuth();
  
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
