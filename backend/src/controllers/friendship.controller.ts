import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { friendshipService } from '../services/friendship.service.js';

export class FriendshipController {
  
  static async sendFriendRequest(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { addresseeId } = req.body; // Already validated by middleware

      if (userId === addresseeId) {
        return res.status(400).json({ error: 'Cannot send friend request to yourself' });
      }

      const friendship = await friendshipService.sendFriendRequest(userId, addresseeId);
      return res.json(friendship);
    } catch (error: any) {
      console.error('[FriendshipController] Error sending request:', error);
      return res.status(400).json({ error: error.message });
    }
  }

  static async acceptFriendRequest(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params; // Already validated by middleware

      const friendship = await friendshipService.acceptFriendRequest(userId, id);
      return res.json(friendship);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async rejectFriendRequest(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params; // Already validated by middleware

      const friendship = await friendshipService.rejectFriendRequest(userId, id);
      return res.json(friendship);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  static async getFriends(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const friends = await friendshipService.getFriends(userId);
      return res.json(friends);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getPendingRequests(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const requests = await friendshipService.getPendingRequests(userId);
      return res.json(requests);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  static async getSentRequests(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const requests = await friendshipService.getSentRequests(userId);
      return res.json(requests);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

