import { useMutation } from '@tanstack/react-query';
import { client } from '../utils/client';

interface User {
  id: string;
  email: string;
  name: string;
  isAdmin?: boolean;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) =>
      (await client.post<LoginResponse>('/auth/login', credentials)).data,
  });
}
