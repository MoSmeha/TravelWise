import { Request, Response } from 'express';
import { messageService } from '../services/message.service';
import { socketService } from '../services/socket.service';
import {
  createConversationSchema,
  sendMessageSchema,
  paginationSchema,
  messagePaginationSchema,
  conversationIdSchema,
} from '../schemas/message.schema';

interface AuthRequest extends Request {
  user?: { userId: string };
}

export const messageController = {
  /**
   * GET /messages/conversations
   * Get paginated list of conversations for the authenticated user
   */
  async getConversations(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const parsed = paginationSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid pagination parameters', details: parsed.error.flatten() });
      }

      const { page, limit } = parsed.data;
      const result = await messageService.getConversations(userId, page, limit);
      return res.json(result);
    } catch (error) {
      console.error('[MessageController] Error fetching conversations:', error);
      return res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  },

  /**
   * GET /messages/conversations/:id
   * Get a single conversation with participant details
   */
  async getConversation(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const parsed = conversationIdSchema.safeParse(req.params);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid conversation ID', details: parsed.error.flatten() });
      }

      const conversation = await messageService.getConversation(parsed.data.id, userId);

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      return res.json(conversation);
    } catch (error) {
      console.error('[MessageController] Error fetching conversation:', error);
      return res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  },

  /**
   * POST /messages/conversations
   * Create or get an existing direct conversation with a friend
   */
  async createConversation(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const parsed = createConversationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
      }

      const { friendId } = parsed.data;

      if (friendId === userId) {
        return res.status(400).json({ error: 'Cannot create conversation with yourself' });
      }

      const conversation = await messageService.getOrCreateDirectConversation(userId, friendId);
      return res.status(201).json(conversation);
    } catch (error) {
      console.error('[MessageController] Error creating conversation:', error);
      return res.status(500).json({ error: 'Failed to create conversation' });
    }
  },

  /**
   * GET /messages/conversations/:id/messages
   * Get paginated messages for a conversation
   */
  async getMessages(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const paramsParsed = conversationIdSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        return res.status(400).json({ error: 'Invalid conversation ID', details: paramsParsed.error.flatten() });
      }

      const queryParsed = messagePaginationSchema.safeParse(req.query);
      if (!queryParsed.success) {
        return res.status(400).json({ error: 'Invalid pagination parameters', details: queryParsed.error.flatten() });
      }

      const { page, limit } = queryParsed.data;
      const result = await messageService.getMessages(paramsParsed.data.id, userId, page, limit);
      return res.json(result);
    } catch (error: any) {
      if (error.message === 'Not a participant in this conversation') {
        return res.status(403).json({ error: 'Not a participant in this conversation' });
      }
      console.error('[MessageController] Error fetching messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }
  },

  /**
   * POST /messages/conversations/:id/messages
   * Send a message in a conversation
   */
  async sendMessage(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const paramsParsed = conversationIdSchema.safeParse(req.params);
      if (!paramsParsed.success) {
        return res.status(400).json({ error: 'Invalid conversation ID', details: paramsParsed.error.flatten() });
      }

      const bodyParsed = sendMessageSchema.safeParse(req.body);
      if (!bodyParsed.success) {
        return res.status(400).json({ error: 'Validation failed', details: bodyParsed.error.flatten() });
      }

      const conversationId = paramsParsed.data.id;
      const { content } = bodyParsed.data;

      const message = await messageService.sendMessage(conversationId, userId, content);

      // Emit real-time event to all participants except sender
      const participantIds = await messageService.getConversationParticipantIds(conversationId);
      participantIds
        .filter((id) => id !== userId)
        .forEach((participantId) => {
          socketService.emitToUser(participantId, 'message:new', {
            conversationId,
            message,
          });
        });

      return res.status(201).json(message);
    } catch (error: any) {
      if (error.message === 'Not a participant in this conversation') {
        return res.status(403).json({ error: 'Not a participant in this conversation' });
      }
      console.error('[MessageController] Error sending message:', error);
      return res.status(500).json({ error: 'Failed to send message' });
    }
  },

  /**
   * PUT /messages/conversations/:id/read
   * Mark a conversation as read
   */
  async markConversationRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const parsed = conversationIdSchema.safeParse(req.params);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid conversation ID', details: parsed.error.flatten() });
      }

      await messageService.markConversationRead(parsed.data.id, userId);

      return res.json({ success: true });
    } catch (error) {
      console.error('[MessageController] Error marking conversation read:', error);
      return res.status(500).json({ error: 'Failed to mark conversation as read' });
    }
  },
};
