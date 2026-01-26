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
      updateUser(user);
      return user;
    },
    enabled: !!accessToken,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });
};
