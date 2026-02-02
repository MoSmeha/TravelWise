

import { Conversation, ConversationParticipant, Message } from '../../generated/prisma/client.js';


export interface ConversationWithDetails extends Conversation {
  participants: ConversationParticipantWithUser[];
  messages?: Message[];
  lastMessage?: Message | null;
  unreadCount?: number;
}

export interface ConversationParticipantWithUser extends ConversationParticipant {
  user?: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string;
  };
}

export interface MessageWithSender extends Message {
  sender?: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string;
  };
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface IMessageProvider {
  getOrCreateDirectConversation(userId: string, friendId: string): Promise<ConversationWithDetails>;
  getConversations(userId: string, page: number, limit: number): Promise<PaginatedResult<ConversationWithDetails>>;
  getConversation(conversationId: string, userId: string): Promise<ConversationWithDetails | null>;
  

  getMessages(conversationId: string, userId: string, page: number, limit: number): Promise<PaginatedResult<MessageWithSender>>;
  sendMessage(conversationId: string, senderId: string, content: string): Promise<MessageWithSender>;
  

  markConversationRead(conversationId: string, userId: string): Promise<void>;
  

  getConversationParticipantIds(conversationId: string): Promise<string[]>;
  isUserParticipant(conversationId: string, userId: string): Promise<boolean>;
}
