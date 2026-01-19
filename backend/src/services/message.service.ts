/**
 * Message Service
 * Delegates to message provider for all operations
 */

import { messageProvider } from '../providers/message.provider.pg.js';
import {
  ConversationWithDetails,
  MessageWithSender,
  PaginatedResult,
} from '../provider-contract/message.provider-contract.js';

class MessageService {
  /**
   * Get or create a direct conversation between two users
   */
  async getOrCreateDirectConversation(userId: string, friendId: string): Promise<ConversationWithDetails> {
    return messageProvider.getOrCreateDirectConversation(userId, friendId);
  }

  /**
   * Get paginated conversations for a user
   */
  async getConversations(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResult<ConversationWithDetails>> {
    return messageProvider.getConversations(userId, page, limit);
  }

  /**
   * Get a single conversation by ID with participant details
   */
  async getConversation(conversationId: string, userId: string): Promise<ConversationWithDetails | null> {
    return messageProvider.getConversation(conversationId, userId);
  }

  /**
   * Get paginated messages for a conversation
   */
  async getMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedResult<MessageWithSender>> {
    return messageProvider.getMessages(conversationId, userId, page, limit);
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string
  ): Promise<MessageWithSender> {
    return messageProvider.sendMessage(conversationId, senderId, content);
  }

  /**
   * Mark conversation as read for a user
   */
  async markConversationRead(conversationId: string, userId: string): Promise<void> {
    return messageProvider.markConversationRead(conversationId, userId);
  }

  /**
   * Get all participant user IDs for a conversation (for socket notifications)
   */
  async getConversationParticipantIds(conversationId: string): Promise<string[]> {
    return messageProvider.getConversationParticipantIds(conversationId);
  }
}

export const messageService = new MessageService();
