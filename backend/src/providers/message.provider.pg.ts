/**
 * PostgreSQL Message Provider
 * Implements IMessageProvider using Prisma
 */
import { ConversationType } from '../generated/prisma/client.js';
import prisma from '../lib/prisma.js';
import {
  IMessageProvider,
  ConversationWithDetails,
  MessageWithSender,
  PaginatedResult,
} from '../provider-contract/message.provider-contract.js';

export class PostgresMessageProvider implements IMessageProvider {
  /**
   * Get or create a direct conversation between two users
   */
  async getOrCreateDirectConversation(userId: string, friendId: string): Promise<ConversationWithDetails> {
    // Check if a direct conversation already exists between these two users
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: friendId } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, username: true, avatarUrl: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existingConversation) {
      return this.enrichConversation(existingConversation, userId);
    }

    // Create new conversation
    const newConversation = await prisma.conversation.create({
      data: {
        type: 'DIRECT',
        participants: {
          create: [
            { userId, role: 'MEMBER' },
            { userId: friendId, role: 'MEMBER' },
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, username: true, avatarUrl: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return this.enrichConversation(newConversation, userId);
  }

  /**
   * Get paginated conversations for a user
   */
  async getConversations(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResult<ConversationWithDetails>> {
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: {
          participants: { some: { userId } },
        },
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, name: true, username: true, avatarUrl: true },
              },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.conversation.count({
        where: {
          participants: { some: { userId } },
        },
      }),
    ]);

    const enrichedConversations = await Promise.all(
      conversations.map((conv) => this.enrichConversation(conv, userId))
    );

    return {
      data: enrichedConversations,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + conversations.length < total,
      },
    };
  }

  /**
   * Get a single conversation by ID with participant details
   */
  async getConversation(conversationId: string, userId: string): Promise<ConversationWithDetails | null> {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { userId } },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, name: true, username: true, avatarUrl: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!conversation) return null;

    return this.enrichConversation(conversation, userId);
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
    // Verify user is a participant
    const isParticipant = await this.isUserParticipant(conversationId, userId);
    if (!isParticipant) {
      throw new Error('Not a participant in this conversation');
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.message.count({
        where: { conversationId },
      }),
    ]);

    // Fetch sender details
    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const senders = await prisma.user.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, name: true, username: true, avatarUrl: true },
    });
    const senderMap = new Map(senders.map((s) => [s.id, s]));

    const enrichedMessages: MessageWithSender[] = messages.map((msg) => ({
      ...msg,
      sender: senderMap.get(msg.senderId),
    }));

    return {
      data: enrichedMessages,
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + messages.length < total,
      },
    };
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    conversationId: string,
    senderId: string,
    content: string
  ): Promise<MessageWithSender> {
    // Verify sender is a participant
    const isParticipant = await this.isUserParticipant(conversationId, senderId);
    if (!isParticipant) {
      throw new Error('Not a participant in this conversation');
    }

    // Create message and update conversation timestamp
    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId,
          senderId,
          content,
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    // Fetch sender details
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { id: true, name: true, username: true, avatarUrl: true },
    });

    return {
      ...message,
      sender: sender || undefined,
    };
  }

  /**
   * Mark conversation as read for a user
   */
  async markConversationRead(conversationId: string, userId: string): Promise<void> {
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: { lastReadAt: new Date() },
    });
  }

  /**
   * Get all participant user IDs for a conversation
   */
  async getConversationParticipantIds(conversationId: string): Promise<string[]> {
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true },
    });
    return participants.map((p) => p.userId);
  }

  /**
   * Check if a user is a participant in a conversation
   */
  async isUserParticipant(conversationId: string, userId: string): Promise<boolean> {
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });
    return !!participant;
  }

  /**
   * Enrich a conversation with user details and unread count
   */
  private async enrichConversation(
    conversation: {
      id: string;
      type: ConversationType;
      name: string | null;
      imageUrl: string | null;
      updatedAt: Date;
      participants: {
        userId: string;
        role: string;
        lastReadAt: Date;
        user?: { id: string; name: string; username: string; avatarUrl: string };
      }[];
      messages: { id: string; content: string; senderId: string; conversationId: string; createdAt: Date }[];
    },
    currentUserId: string
  ): Promise<ConversationWithDetails> {
    // Get current user's participant record for lastReadAt
    const currentParticipant = conversation.participants.find(
      (p) => p.userId === currentUserId
    );
    const lastReadAt = currentParticipant?.lastReadAt || new Date(0);

    // Count unread messages
    const unreadCount = await prisma.message.count({
      where: {
        conversationId: conversation.id,
        createdAt: { gt: lastReadAt },
        senderId: { not: currentUserId },
      },
    });

    return {
      id: conversation.id,
      type: conversation.type,
      name: conversation.name,
      imageUrl: conversation.imageUrl,
      createdAt: (conversation as any).createdAt || new Date(),
      updatedAt: conversation.updatedAt,
      participants: conversation.participants.map((p) => ({
        id: '',
        conversationId: conversation.id,
        userId: p.userId,
        role: p.role,
        joinedAt: new Date(),
        lastReadAt: p.lastReadAt,
        user: p.user || undefined,
      })),
      lastMessage: conversation.messages[0] || null,
      unreadCount,
    };
  }
}

export const messageProvider = new PostgresMessageProvider();
