import { Request, Response } from 'express';
import { messageService } from '../services/message.service.js';
import { socketService } from '../services/socket.service.js';

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

      // Data already validated by middleware
      const { page, limit } = req.query as unknown as { page: number; limit: number };
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

      // Data already validated by middleware
      const { id } = req.params;
      const conversation = await messageService.getConversation(id, userId);

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

      // Data already validated by middleware
      const { friendId } = req.body;

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

      // Data already validated by middleware
      const { id } = req.params;
      const { page, limit } = req.query as unknown as { page: number; limit: number };

      const result = await messageService.getMessages(id, userId, page, limit);
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

      // Data already validated by middleware
      const conversationId = req.params.id;
      const { content } = req.body;

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

      // Data already validated by middleware
      const { id } = req.params;

      await messageService.markConversationRead(id, userId);

      return res.json({ success: true });
    } catch (error) {
      console.error('[MessageController] Error marking conversation read:', error);
      return res.status(500).json({ error: 'Failed to mark conversation as read' });
    }
  },
};
