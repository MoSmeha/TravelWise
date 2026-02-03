import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../../services/user';
import { useAuth } from '../../store/authStore';


export function useUpdateAvatar() {
  const queryClient = useQueryClient();
  const { updateUser, user } = useAuth();

  return useMutation({
    mutationFn: (imageUri: string) => userService.updateAvatar(imageUri),
    onSuccess: (data) => {

      if (user) {
        updateUser({ ...user, avatarUrl: data.avatarUrl });
      }

      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}

