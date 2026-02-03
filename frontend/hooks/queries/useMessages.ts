import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import api from '../../services/api-client';
import { useAuth } from '../../store/authStore';
import {
  ConversationSchema,
  MessageSchema,
  PaginatedConversationsSchema,
  PaginatedMessagesSchema,
  type Conversation,
  type Message,
  type PaginatedConversations,
  type PaginatedMessages,
} from '../../types/schemas';

export type { Conversation, Message };

export const useConversations = (page: number = 1, limit: number = 20) => {
  const { isAuthenticated, isRestoring } = useAuth();
  
  return useQuery({
    queryKey: ['conversations', page, limit],
    queryFn: async (): Promise<PaginatedConversations> => {
      const response = await api.get('/messages/conversations', {
        params: { page, limit },
      });
      return PaginatedConversationsSchema.parse(response.data);
    },
    enabled: isAuthenticated && !isRestoring,
  });
};


export const useInfiniteConversations = (limit: number = 20) => {
  const { isAuthenticated, isRestoring } = useAuth();
  
  return useInfiniteQuery({
    queryKey: ['conversations', 'infinite'],
    queryFn: async ({ pageParam = 1 }): Promise<PaginatedConversations> => {
      const response = await api.get('/messages/conversations', {
        params: { page: pageParam, limit },
      });
      return PaginatedConversationsSchema.parse(response.data);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: isAuthenticated && !isRestoring,
  });
};


export const useConversation = (conversationId: string) => {
  const { isAuthenticated, isRestoring } = useAuth();
  
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async (): Promise<Conversation> => {
      const response = await api.get(`/messages/conversations/${conversationId}`);
      return ConversationSchema.parse(response.data);
    },
    enabled: isAuthenticated && !isRestoring && !!conversationId,
  });
};


export const useMessages = (conversationId: string, page: number = 1, limit: number = 50) => {
  const { isAuthenticated, isRestoring } = useAuth();
  
  return useQuery({
    queryKey: ['messages', conversationId, page, limit],
    queryFn: async (): Promise<PaginatedMessages> => {
      const response = await api.get(`/messages/conversations/${conversationId}/messages`, {
        params: { page, limit },
      });
      return PaginatedMessagesSchema.parse(response.data);
    },
    enabled: isAuthenticated && !isRestoring && !!conversationId,
  });
};


export const useInfiniteMessages = (conversationId: string, limit: number = 50) => {
  const { isAuthenticated, isRestoring } = useAuth();
  
  return useInfiniteQuery({
    queryKey: ['messages', conversationId, 'infinite'],
    queryFn: async ({ pageParam = 1 }): Promise<PaginatedMessages> => {
      const response = await api.get(`/messages/conversations/${conversationId}/messages`, {
        params: { page: pageParam, limit },
      });
      return PaginatedMessagesSchema.parse(response.data);
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    enabled: isAuthenticated && !isRestoring && !!conversationId,
  });
};


export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (friendId: string): Promise<Conversation> => {
      const response = await api.post('/messages/conversations', { friendId });
      return ConversationSchema.parse(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};


export const useSendMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }): Promise<Message> => {
      const response = await api.post(`/messages/conversations/${conversationId}/messages`, { content });
      return MessageSchema.parse(response.data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
};


export const useMarkConversationRead = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (conversationId: string): Promise<void> => {
      await api.put(`/messages/conversations/${conversationId}/read`);
    },
    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ['conversations', 'infinite'] });
      queryClient.invalidateQueries({ queryKey: ['conversations', 'unread-count'] });
    },
  });
};


export const useUnreadMessageCount = () => {
  const { isAuthenticated, isRestoring } = useAuth();
  
  return useQuery({
    queryKey: ['conversations', 'unread-count'],
    queryFn: async (): Promise<number> => {
      const response = await api.get('/messages/conversations', {
        params: { page: 1, limit: 100 },
      });
      const data = PaginatedConversationsSchema.parse(response.data);
      return data.data.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
    },
    enabled: isAuthenticated && !isRestoring,
    staleTime: 30000,
  });
};
