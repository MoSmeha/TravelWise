import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContext, resetAllMocks } from './setup.js';

vi.mock('../modules/user/user.service.js', () => ({
  updateAvatar: vi.fn(),
  getUserById: vi.fn(),
  sanitizeUser: vi.fn((user) => user),
}));

vi.mock('../services/friendship.service.js', () => ({
  searchUsers: vi.fn(),
}));

vi.mock('../services/socket.service.js', () => ({
  socketService: { isUserOnline: vi.fn() },
}));

import * as UsersController from '../modules/user/user.controller.js';
import { searchUsers } from '../services/friendship.service.js';
import { updateAvatar, getUserById } from '../modules/user/user.service.js';

const mockUser = { id: 'user-123', name: 'Test User', username: 'testuser' };

describe('Users Controller', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('GET /api/users/search', () => {
    it('should return search results', async () => {
      const { req, res } = createMockContext();
      req.query = { q: 'test' };

      vi.mocked(searchUsers).mockResolvedValue([mockUser as any]);

      await UsersController.searchUsers(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('PUT /api/users/avatar', () => {
    it('should update avatar', async () => {
      const { req, res } = createMockContext();
      req.file = { buffer: Buffer.from('test') } as any;

      vi.mocked(updateAvatar).mockResolvedValue({ avatarUrl: 'https://example.com/avatar.jpg' } as any);

      await UsersController.updateAvatar(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it('should return 400 when no file', async () => {
      const { req, res } = createMockContext();

      await UsersController.updateAvatar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('GET /api/users/me', () => {
    it('should return user profile', async () => {
      const { req, res } = createMockContext();

      vi.mocked(getUserById).mockResolvedValue(mockUser as any);

      await UsersController.getMe(req, res);

      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it('should return 404 when not found', async () => {
      const { req, res } = createMockContext();

      vi.mocked(getUserById).mockResolvedValue(null);

      await UsersController.getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
