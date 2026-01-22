/**
 * Friendship Controller Tests
 * Tests for friendship management endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContext, resetAllMocks } from './setup.js';

// Mock the friendship service
vi.mock('../../services/friendship.service.js', () => ({
  sendFriendRequest: vi.fn(),
  acceptFriendRequest: vi.fn(),
  rejectFriendRequest: vi.fn(),
  getFriends: vi.fn(),
  getPendingRequests: vi.fn(),
  getSentRequests: vi.fn(),
}));

import * as FriendshipController from '../../controllers/friendship.controller.js';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getPendingRequests,
  getSentRequests
} from '../../services/friendship.service.js';

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

      expect(sendFriendRequest).toHaveBeenCalledWith(
        req.user.userId,
        'friend-user-id'
      );
      expect(res.json).toHaveBeenCalledWith(mockFriendship);
    });

    it('should return 400 when sending request to self', async () => {
      const { req, res } = createMockContext();
      req.body = { addresseeId: req.user.userId }; // Same as current user

      await FriendshipController.sendFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Cannot send friend request to yourself',
      });
    });

    it('should return 400 for duplicate request', async () => {
      const { req, res } = createMockContext();
      req.body = { addresseeId: 'friend-user-id' };

      vi.mocked(sendFriendRequest).mockRejectedValue(
        new Error('Friend request already pending')
      );

      await FriendshipController.sendFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Friend request already pending',
      });
    });
  });

  describe('PUT /api/friends/request/:id/accept', () => {
    it('should successfully accept a friend request', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'friendship-123' };

      const acceptedFriendship = { ...mockFriendship, status: 'ACCEPTED' };
      vi.mocked(acceptFriendRequest).mockResolvedValue(acceptedFriendship as any);

      await FriendshipController.acceptFriendRequest(req, res);

      expect(acceptFriendRequest).toHaveBeenCalledWith(
        req.user.userId,
        'friendship-123'
      );
      expect(res.json).toHaveBeenCalledWith(acceptedFriendship);
    });

    it('should return 400 for unauthorized accept', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'friendship-123' };

      vi.mocked(acceptFriendRequest).mockRejectedValue(
        new Error('Unauthorized to accept this request')
      );

      await FriendshipController.acceptFriendRequest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('PUT /api/friends/request/:id/reject', () => {
    it('should successfully reject a friend request', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'friendship-123' };

      const rejectedFriendship = { ...mockFriendship, status: 'REJECTED' };
      vi.mocked(rejectFriendRequest).mockResolvedValue(rejectedFriendship as any);

      await FriendshipController.rejectFriendRequest(req, res);

      expect(rejectFriendRequest).toHaveBeenCalledWith(
        req.user.userId,
        'friendship-123'
      );
      expect(res.json).toHaveBeenCalledWith(rejectedFriendship);
    });
  });

  describe('GET /api/friends', () => {
    it('should return list of friends', async () => {
      const { req, res } = createMockContext();

      const friends = [
        { id: 'friend-1', name: 'Friend One', username: 'friend1' },
        { id: 'friend-2', name: 'Friend Two', username: 'friend2' },
      ];
      vi.mocked(getFriends).mockResolvedValue(friends as any);

      await FriendshipController.getFriends(req, res);

      expect(getFriends).toHaveBeenCalledWith(req.user.userId);
      expect(res.json).toHaveBeenCalledWith(friends);
    });
  });

  describe('GET /api/friends/requests/pending', () => {
    it('should return pending requests', async () => {
      const { req, res } = createMockContext();

      const pendingRequests = [mockFriendship];
      vi.mocked(getPendingRequests).mockResolvedValue(pendingRequests as any);

      await FriendshipController.getPendingRequests(req, res);

      expect(getPendingRequests).toHaveBeenCalledWith(req.user.userId);
      expect(res.json).toHaveBeenCalledWith(pendingRequests);
    });
  });

  describe('GET /api/friends/requests/sent', () => {
    it('should return sent requests', async () => {
      const { req, res } = createMockContext();

      const sentRequests = [mockFriendship];
      vi.mocked(getSentRequests).mockResolvedValue(sentRequests as any);

      await FriendshipController.getSentRequests(req, res);

      expect(getSentRequests).toHaveBeenCalledWith(req.user.userId);
      expect(res.json).toHaveBeenCalledWith(sentRequests);
    });
  });
});
