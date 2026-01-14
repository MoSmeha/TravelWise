import { useQuery } from '@tanstack/react-query';
import { authService } from '../../services/auth';
import { useAuth } from '../../store/authStore';

export const USER_QUERY_KEY = ['user', 'me'];

export const useUser = () => {
  const accessToken = useAuth((state) => state.accessToken);
  const updateUser = useAuth((state) => state.updateUser);

  return useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: async () => {
      const user = await authService.getMe();
      updateUser(user); // Sync with store if needed, though relying on query cache is better. 
                      // Keeping in store might be useful if other non-react parts utilize it, 
                      // but ideally we migrate to reading from QueryCache or just passing props.
                      // For now, syncing is a safe hybrid step.
      return user;
    },
    enabled: !!accessToken, // Only fetch if we have a token
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
