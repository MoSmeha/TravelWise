import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../services/api';
import { useAuth } from '../../store/authStore';

/**
 * Hook for updating user's avatar
 */
export function useUpdateAvatar() {
  const queryClient = useQueryClient();
  const { updateUser, user } = useAuth();

  return useMutation({
    mutationFn: (imageUri: string) => userService.updateAvatar(imageUri),
    onSuccess: (data) => {
      // Update the user in auth store
      if (user) {
        updateUser({ ...user, avatarUrl: data.avatarUrl });
      }
      // Invalidate user queries
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

