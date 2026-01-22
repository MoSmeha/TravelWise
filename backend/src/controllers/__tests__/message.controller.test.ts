/**
 * Message Controller Tests
 * Tests for messaging endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContext, resetAllMocks } from './setup.js';

// Mock the message service
// Mock the message service
vi.mock('../../services/message.service.js', () => ({
  getConversations: vi.fn(),
  getConversation: vi.fn(),
  getOrCreateDirectConversation: vi.fn(),
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  markConversationRead: vi.fn(),
  getConversationParticipantIds: vi.fn(),
}));

// Mock socket service
vi.mock('../../services/socket.service.js', () => ({
  socketService: {
    emitToUser: vi.fn(),
  },
}));

import * as messageController from '../../controllers/message.controller.js';
import * as messageService from '../../services/message.service.js';

const mockConversation = {
  id: 'conv-123',
  type: 'DIRECT',
  name: null,
  imageUrl: null,
  updatedAt: new Date(),
  participants: [
    { userId: 'user-1', role: 'MEMBER' },
    { userId: 'user-2', role: 'MEMBER' },
  ],
};

const mockMessage = {
  id: 'msg-123',
  content: 'Hello!',
  senderId: 'user-1',
  conversationId: 'conv-123',
  createdAt: new Date(),
};

describe('Message Controller', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('GET /api/messages/conversations', () => {
    it('should return paginated conversations', async () => {
      const { req, res } = createMockContext();
      req.query = { page: 1, limit: 20 };

      const result = {
        data: [mockConversation],
        pagination: { page: 1, limit: 20, total: 1, hasMore: false },
      };
      vi.mocked(messageService.getConversations).mockResolvedValue(result as any);

      await messageController.getConversations(req, res);

      expect(messageService.getConversations).toHaveBeenCalledWith(
        req.user.userId,
        1,
        20
      );
      expect(res.json).toHaveBeenCalledWith(result);
    });

    it('should return 401 when not authenticated', async () => {
      const { req, res } = createMockContext();
      req.user = undefined;

      await messageController.getConversations(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });

  describe('GET /api/messages/conversations/:id', () => {
    it('should return a single conversation', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'conv-123' };

      vi.mocked(messageService.getConversation).mockResolvedValue(mockConversation as any);

      await messageController.getConversation(req, res);

      expect(messageService.getConversation).toHaveBeenCalledWith('conv-123', req.user.userId);
      expect(res.json).toHaveBeenCalledWith(mockConversation);
    });

    it('should return 404 when conversation not found', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'non-existent' };

      vi.mocked(messageService.getConversation).mockResolvedValue(null);

      await messageController.getConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Conversation not found' });
    });
  });

  describe('POST /api/messages/conversations', () => {
    it('should create or get a conversation', async () => {
      const { req, res } = createMockContext();
      req.body = { friendId: 'friend-123' };

      vi.mocked(messageService.getOrCreateDirectConversation).mockResolvedValue(mockConversation as any);

      await messageController.createConversation(req, res);

      expect(messageService.getOrCreateDirectConversation).toHaveBeenCalledWith(
        req.user.userId,
        'friend-123'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockConversation);
    });

    it('should return 400 when creating conversation with self', async () => {
      const { req, res } = createMockContext();
      req.body = { friendId: req.user.userId };

      await messageController.createConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Cannot create conversation with yourself',
      });
    });
  });

  describe('GET /api/messages/conversations/:id/messages', () => {
    it('should return paginated messages', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'conv-123' };
      req.query = { page: 1, limit: 50 };

      const result = {
        data: [mockMessage],
        pagination: { page: 1, limit: 50, total: 1, hasMore: false },
      };
      vi.mocked(messageService.getMessages).mockResolvedValue(result as any);

      await messageController.getMessages(req, res);

      expect(messageService.getMessages).toHaveBeenCalledWith(
        'conv-123',
        req.user.userId,
        1,
        50
      );
      expect(res.json).toHaveBeenCalledWith(result);
    });

    it('should return 403 when not a participant', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'conv-123' };
      req.query = { page: 1, limit: 50 };

      vi.mocked(messageService.getMessages).mockRejectedValue(
        new Error('Not a participant in this conversation')
      );

      await messageController.getMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Not a participant in this conversation',
      });
    });
  });

  describe('POST /api/messages/conversations/:id/messages', () => {
    it('should send a message', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'conv-123' };
      req.body = { content: 'Hello!' };

      vi.mocked(messageService.sendMessage).mockResolvedValue(mockMessage as any);
      vi.mocked(messageService.getConversationParticipantIds).mockResolvedValue([
        req.user.userId,
        'other-user',
      ]);

      await messageController.sendMessage(req, res);

      expect(messageService.sendMessage).toHaveBeenCalledWith(
        'conv-123',
        req.user.userId,
        'Hello!'
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockMessage);
    });

    it('should return 403 when not a participant', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'conv-123' };
      req.body = { content: 'Hello!' };

      vi.mocked(messageService.sendMessage).mockRejectedValue(
        new Error('Not a participant in this conversation')
      );

      await messageController.sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('PUT /api/messages/conversations/:id/read', () => {
    it('should mark conversation as read', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'conv-123' };

      vi.mocked(messageService.markConversationRead).mockResolvedValue(undefined);

      await messageController.markConversationRead(req, res);

      expect(messageService.markConversationRead).toHaveBeenCalledWith(
        'conv-123',
        req.user.userId
      );
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });
});
