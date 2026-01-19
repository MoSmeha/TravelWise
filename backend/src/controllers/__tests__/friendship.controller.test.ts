/**
 * Friendship Controller Tests
 * Tests for friendship management endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContext, resetAllMocks } from './setup.js';

// Mock the friendship service
vi.mock('../../services/friendship.service.js', () => ({
  friendshipService: {
    sendFriendRequest: vi.fn(),
    acceptFriendRequest: vi.fn(),
    rejectFriendRequest: vi.fn(),
    getFriends: vi.fn(),
    getPendingRequests: vi.fn(),
    getSentRequests: vi.fn(),
  },
}));

import { FriendshipController } from '../../controllers/friendship.controller.js';
import { friendshipService } from '../../services/friendship.service.js';

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

      vi.mocked(friendshipService.sendFriendRequest).mockResolvedValue(mockFriendship as any);

      await FriendshipController.sendFriendRequest(req, res);

      expect(friendshipService.sendFriendRequest).toHaveBeenCalledWith(
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

      vi.mocked(friendshipService.sendFriendRequest).mockRejectedValue(
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
      vi.mocked(friendshipService.acceptFriendRequest).mockResolvedValue(acceptedFriendship as any);

      await FriendshipController.acceptFriendRequest(req, res);

      expect(friendshipService.acceptFriendRequest).toHaveBeenCalledWith(
        req.user.userId,
        'friendship-123'
      );
      expect(res.json).toHaveBeenCalledWith(acceptedFriendship);
    });

    it('should return 400 for unauthorized accept', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'friendship-123' };

      vi.mocked(friendshipService.acceptFriendRequest).mockRejectedValue(
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
      vi.mocked(friendshipService.rejectFriendRequest).mockResolvedValue(rejectedFriendship as any);

      await FriendshipController.rejectFriendRequest(req, res);

      expect(friendshipService.rejectFriendRequest).toHaveBeenCalledWith(
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
      vi.mocked(friendshipService.getFriends).mockResolvedValue(friends as any);

      await FriendshipController.getFriends(req, res);

      expect(friendshipService.getFriends).toHaveBeenCalledWith(req.user.userId);
      expect(res.json).toHaveBeenCalledWith(friends);
    });
  });

  describe('GET /api/friends/requests/pending', () => {
    it('should return pending requests', async () => {
      const { req, res } = createMockContext();

      const pendingRequests = [mockFriendship];
      vi.mocked(friendshipService.getPendingRequests).mockResolvedValue(pendingRequests as any);

      await FriendshipController.getPendingRequests(req, res);

      expect(friendshipService.getPendingRequests).toHaveBeenCalledWith(req.user.userId);
      expect(res.json).toHaveBeenCalledWith(pendingRequests);
    });
  });

  describe('GET /api/friends/requests/sent', () => {
    it('should return sent requests', async () => {
      const { req, res } = createMockContext();

      const sentRequests = [mockFriendship];
      vi.mocked(friendshipService.getSentRequests).mockResolvedValue(sentRequests as any);

      await FriendshipController.getSentRequests(req, res);

      expect(friendshipService.getSentRequests).toHaveBeenCalledWith(req.user.userId);
      expect(res.json).toHaveBeenCalledWith(sentRequests);
    });
  });
});
