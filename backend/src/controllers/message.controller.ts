import { Request, Response } from 'express';
import {
  getConversations as listConversations,
  getConversation as fetchConversation,
  getOrCreateDirectConversation,
  getMessages as listMessages,
  sendMessage as sendUserMessage,
  markConversationRead as markRead,
  getConversationParticipantIds
} from '../services/message.service.js';
import { socketService } from '../services/socket.service.js';

interface AuthRequest extends Request {
  user?: { userId: string };
}


export async function getConversations(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }


    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const result = await listConversations(userId, page, limit);
    return res.json(result);
  } catch (error) {
    console.error('[MessageController] Error fetching conversations:', error);
    return res.status(500).json({ error: 'Failed to fetch conversations' });
  }
}


export async function getConversation(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Data already validated by middleware
    const { id } = req.params;
    const conversation = await fetchConversation(id, userId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    return res.json(conversation);
  } catch (error) {
    console.error('[MessageController] Error fetching conversation:', error);
    return res.status(500).json({ error: 'Failed to fetch conversation' });
  }
}


export async function createConversation(req: AuthRequest, res: Response) {
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

    const conversation = await getOrCreateDirectConversation(userId, friendId);
    return res.status(201).json(conversation);
  } catch (error) {
    console.error('[MessageController] Error creating conversation:', error);
    return res.status(500).json({ error: 'Failed to create conversation' });
  }
}


export async function getMessages(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Data already validated by middleware
    const { id } = req.params;
    const { page, limit } = req.query as unknown as { page: number; limit: number };

    const result = await listMessages(id, userId, page, limit);
    return res.json(result);
  } catch (error: any) {
    if (error.message === 'Not a participant in this conversation') {
      return res.status(403).json({ error: 'Not a participant in this conversation' });
    }
    console.error('[MessageController] Error fetching messages:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
}


export async function sendMessage(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Data already validated by middleware
    const conversationId = req.params.id;
    const { content } = req.body;

    const message = await sendUserMessage(conversationId, userId, content);

    // Emit real-time event to all participants except sender
    const participantIds = await getConversationParticipantIds(conversationId);
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
}


export async function markConversationRead(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Data already validated by middleware
    const { id } = req.params;

    await markRead(id, userId);

    return res.json({ success: true });
  } catch (error) {
    console.error('[MessageController] Error marking conversation read:', error);
    return res.status(500).json({ error: 'Failed to mark conversation as read' });
  }
}
