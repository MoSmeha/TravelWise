import { useQuery } from '@tanstack/react-query';
import { client } from '../utils/client';

export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  avatarUrl: string;
  emailVerified: boolean;
  isAdmin: boolean;
  createdAt: string;
  itineraryCount: number;
  postCount: number;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function useUsersQuery(page: number, pageSize: number, search?: string) {
  return useQuery({
    queryKey: ['users', page, pageSize, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (search) params.append('search', search);
      
      return (await client.get<UsersResponse>(`/admin/users?${params.toString()}`)).data;
    },
    placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
  });
}
