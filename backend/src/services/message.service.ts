import {
  ConversationWithDetails,
  MessageWithSender,
  PaginatedResult,
} from '../provider-contract/message.provider-contract.js';
import { messageProvider } from '../providers/message.provider.pg.js';

/**
 * Get or create a direct conversation between two users
 */
export async function getOrCreateDirectConversation(userId: string, friendId: string): Promise<ConversationWithDetails> {
  return messageProvider.getOrCreateDirectConversation(userId, friendId);
}

/**
 * Get conversations for a user
 */
export async function getConversations(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResult<ConversationWithDetails>> {
  return messageProvider.getConversations(userId, page, limit);
}

/**
 * Get a single conversation by ID
 */
export async function getConversation(conversationId: string, userId: string): Promise<ConversationWithDetails | null> {
  return messageProvider.getConversation(conversationId, userId);
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  conversationId: string,
  userId: string,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResult<MessageWithSender>> {
  return messageProvider.getMessages(conversationId, userId, page, limit);
}

/**
 * Send a message
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<MessageWithSender> {
  return messageProvider.sendMessage(conversationId, senderId, content);
}

/**
 * Mark a conversation as read
 */
export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  return messageProvider.markConversationRead(conversationId, userId);
}

/**
 * Get IDs of participants in a conversation
 */
export async function getConversationParticipantIds(conversationId: string): Promise<string[]> {
  return messageProvider.getConversationParticipantIds(conversationId);
}
