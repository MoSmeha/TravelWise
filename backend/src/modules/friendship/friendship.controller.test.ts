import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContext, resetAllMocks } from '../../tests/setup.js';

vi.mock('./friendship.service.js', () => ({
  sendFriendRequest: vi.fn(),
  acceptFriendRequest: vi.fn(),
  rejectFriendRequest: vi.fn(),
  getFriends: vi.fn(),
  getPendingRequests: vi.fn(),
  getSentRequests: vi.fn(),
}));

import * as FriendshipController from './friendship.controller.js';
import { sendFriendRequest, acceptFriendRequest, getFriends, getPendingRequests } from './friendship.service.js';

const mockFriendship = {
  id: 'friendship-123',
  requesterId: 'user-1',
  addresseeId: 'user-2',
  status: 'PENDING',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Friendship Controller', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('POST /api/friends/request', () => {
    it('should successfully send a friend request', async () => {
      const { req, res } = createMockContext();
      req.body = { addresseeId: 'friend-user-id' };

      vi.mocked(sendFriendRequest).mockResolvedValue(mockFriendship as any);

      await FriendshipController.sendFriendRequest(req, res);

      expect(res.json).toHaveBeenCalledWith(mockFriendship);
    });

    it('should return 400 when sending request to self', async () => {
      const { req, res } = createMockContext();
      req.body = { addresseeId: req.user.userId };

      await FriendshipController.sendFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('PUT /api/friends/request/:id/accept', () => {
    it('should successfully accept a friend request', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'friendship-123' };

      vi.mocked(acceptFriendRequest).mockResolvedValue({ ...mockFriendship, status: 'ACCEPTED' } as any);

      await FriendshipController.acceptFriendRequest(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('GET /api/friends', () => {
    it('should return list of friends', async () => {
      const { req, res } = createMockContext();

      vi.mocked(getFriends).mockResolvedValue([{ id: 'friend-1', name: 'Friend One' }] as any);

      await FriendshipController.getFriends(req, res);

      expect(getFriends).toHaveBeenCalledWith(req.user.userId);
    });
  });

  describe('GET /api/friends/requests/pending', () => {
    it('should return pending requests', async () => {
      const { req, res } = createMockContext();

      vi.mocked(getPendingRequests).mockResolvedValue([mockFriendship] as any);

      await FriendshipController.getPendingRequests(req, res);

      expect(getPendingRequests).toHaveBeenCalledWith(req.user.userId);
    });
  });
});
