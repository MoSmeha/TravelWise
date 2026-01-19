/**
 * Message Zod Schemas
 * Validation schemas for messaging endpoints
 */

import { z } from 'zod';

/**
 * Schema for creating/getting a conversation
 */
export const createConversationSchema = z.object({
  friendId: z.string().min(1, 'Friend ID is required'),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;

/**
 * Schema for sending a message
 */
export const sendMessageSchema = z.object({
  content: z.string()
    .min(1, 'Message content is required')
    .max(2000, 'Message cannot exceed 2000 characters')
    .trim(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/**
 * Schema for pagination query params
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/**
 * Schema for message pagination (higher default limit)
 */
export const messagePaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type MessagePaginationInput = z.infer<typeof messagePaginationSchema>;

/**
 * Schema for conversation ID param
 */
export const conversationIdSchema = z.object({
  id: z.string().min(1, 'Conversation ID is required'),
});

export type ConversationIdInput = z.infer<typeof conversationIdSchema>;

// Response schemas (for documentation/validation)

export const UserInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  avatarUrl: z.string(),
});

export const ConversationParticipantSchema = z.object({
  userId: z.string(),
  role: z.string(),
  lastReadAt: z.string().datetime(),
  user: UserInfoSchema.optional(),
});

export const MessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  senderId: z.string(),
  conversationId: z.string(),
  createdAt: z.string().datetime(),
  sender: UserInfoSchema.optional(),
});

export const ConversationSchema = z.object({
  id: z.string(),
  type: z.enum(['DIRECT', 'GROUP']),
  name: z.string().nullable(),
  imageUrl: z.string().nullable(),
  updatedAt: z.string().datetime(),
  participants: z.array(ConversationParticipantSchema),
  lastMessage: MessageSchema.nullable().optional(),
  unreadCount: z.number().optional(),
});

export const PaginatedConversationsSchema = z.object({
  data: z.array(ConversationSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    hasMore: z.boolean(),
  }),
});

export const PaginatedMessagesSchema = z.object({
  data: z.array(MessageSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    hasMore: z.boolean(),
  }),
});
