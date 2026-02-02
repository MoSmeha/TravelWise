import {
  ConversationWithDetails,
  MessageWithSender,
  PaginatedResult,
} from './message.contract.js';
import { messageProvider } from './message.provider.js';


export async function getOrCreateDirectConversation(userId: string, friendId: string): Promise<ConversationWithDetails> {
  return messageProvider.getOrCreateDirectConversation(userId, friendId);
}


export async function getConversations(
  userId: string,
  page: number = 1,
  limit: number = 20
): Promise<PaginatedResult<ConversationWithDetails>> {
  return messageProvider.getConversations(userId, page, limit);
}


export async function getConversation(conversationId: string, userId: string): Promise<ConversationWithDetails | null> {
  return messageProvider.getConversation(conversationId, userId);
}


export async function getMessages(
  conversationId: string,
  userId: string,
  page: number = 1,
  limit: number = 50
): Promise<PaginatedResult<MessageWithSender>> {
  return messageProvider.getMessages(conversationId, userId, page, limit);
}


export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<MessageWithSender> {
  return messageProvider.sendMessage(conversationId, senderId, content);
}


export async function markConversationRead(conversationId: string, userId: string): Promise<void> {
  return messageProvider.markConversationRead(conversationId, userId);
}


export async function getConversationParticipantIds(conversationId: string): Promise<string[]> {
  return messageProvider.getConversationParticipantIds(conversationId);
}
