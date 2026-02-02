import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContext, resetAllMocks } from './setup.js';

vi.mock('../modules/message/message.service.js', () => ({
  getConversations: vi.fn(),
  getConversation: vi.fn(),
  getOrCreateDirectConversation: vi.fn(),
  getMessages: vi.fn(),
  sendMessage: vi.fn(),
  markConversationRead: vi.fn(),
  getConversationParticipantIds: vi.fn(),
}));

vi.mock('../services/socket.service.js', () => ({
  socketService: { emitToUser: vi.fn() },
}));

import * as messageController from '../modules/message/message.controller.js';
import * as messageService from '../modules/message/message.service.js';

const mockConversation = { id: 'conv-123', type: 'DIRECT', participants: [] };
const mockMessage = { id: 'msg-123', content: 'Hello!', senderId: 'user-1' };

describe('Message Controller', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('GET /api/messages/conversations', () => {
    it('should return conversations', async () => {
      const { req, res } = createMockContext();
      req.query = { page: 1, limit: 20 };

      vi.mocked(messageService.getConversations).mockResolvedValue({ data: [mockConversation], pagination: {} } as any);

      await messageController.getConversations(req, res);

      expect(messageService.getConversations).toHaveBeenCalled();
    });

    it('should return 401 when not authenticated', async () => {
      const { req, res } = createMockContext();
      req.user = undefined;

      await messageController.getConversations(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('GET /api/messages/conversations/:id', () => {
    it('should return 404 when not found', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'non-existent' };

      vi.mocked(messageService.getConversation).mockResolvedValue(null);

      await messageController.getConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('POST /api/messages/conversations', () => {
    it('should create a conversation', async () => {
      const { req, res } = createMockContext();
      req.body = { friendId: 'friend-123' };

      vi.mocked(messageService.getOrCreateDirectConversation).mockResolvedValue(mockConversation as any);

      await messageController.createConversation(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('POST /api/messages/conversations/:id/messages', () => {
    it('should send a message', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'conv-123' };
      req.body = { content: 'Hello!' };

      vi.mocked(messageService.sendMessage).mockResolvedValue(mockMessage as any);
      vi.mocked(messageService.getConversationParticipantIds).mockResolvedValue(['user-1', 'user-2']);

      await messageController.sendMessage(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});
