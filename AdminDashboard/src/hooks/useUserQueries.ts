import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { client } from '../utils/client';
import { UsersResponseSchema } from '../types/schemas';

export function useUsersQuery(
  page: number,
  pageSize: number,
  search?: string
) {
  return useQuery({
    queryKey: ['users', page, pageSize, search ?? ''],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (search) params.set('search', search);

      const { data } = await client.get(`/admin/users?${params.toString()}`);
      return UsersResponseSchema.parse(data);
    },
    placeholderData: keepPreviousData,
  });
}
