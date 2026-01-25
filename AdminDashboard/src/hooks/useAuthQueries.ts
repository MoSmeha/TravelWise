import { useMutation } from '@tanstack/react-query';
import { client } from '../utils/client';

import { LoginResponseSchema } from '../types/schemas';

export function useLoginMutation() {
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const { data } = await client.post('/auth/login', credentials);
      return LoginResponseSchema.parse(data);
    },
  });
}
