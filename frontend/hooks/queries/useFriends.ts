import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api-client';
import { useAuth } from '../../store/authStore';

export interface User {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

export interface FriendRequest {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  requester?: User;
  addressee?: User;
}


export const useFriends = () => {
  const { isAuthenticated, isRestoring } = useAuth();
  return useQuery({
    queryKey: ['friends'],
    queryFn: async (): Promise<User[]> => {
      const response = await api.get('/friends');
      return response.data;
    },
    enabled: isAuthenticated && !isRestoring,
  });
};


export const usePendingRequests = () => {
  const { isAuthenticated, isRestoring } = useAuth();
  return useQuery({
    queryKey: ['friends', 'pending'],
    queryFn: async (): Promise<FriendRequest[]> => {
      const response = await api.get('/friends/requests/pending');
      return response.data;
    },
    enabled: isAuthenticated && !isRestoring,
  });
};


export const useSentRequests = () => {
  const { isAuthenticated, isRestoring } = useAuth();
  return useQuery({
    queryKey: ['friends', 'sent'],
    queryFn: async (): Promise<FriendRequest[]> => {
      const response = await api.get('/friends/requests/sent');
      return response.data;
    },
    enabled: isAuthenticated && !isRestoring,
  });
};


export const useSearchUsers = (query: string) => {
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: async (): Promise<User[]> => {
      const response = await api.get('/users/search', { params: { q: query } });
      return response.data;
    },
    enabled: query.length >= 2,
  });
};


export const useSendFriendRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (addresseeId: string) => {
      const response = await api.post('/friends/request', { addresseeId });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', 'sent'] });
    },
  });
};


export const useAcceptFriendRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (requestId: string) => {
      const response = await api.put(`/friends/request/${requestId}/accept`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friends', 'pending'] });
    },
  });
};


export const useRejectFriendRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (requestId: string) => {
      const response = await api.put(`/friends/request/${requestId}/reject`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', 'pending'] });
    },
  });
};
