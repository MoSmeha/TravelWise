import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import {
  sendFriendRequest as sendRequest,
  acceptFriendRequest as acceptRequest,
  rejectFriendRequest as rejectRequest,
  getFriends as listFriends,
  getPendingRequests as listPendingRequests,
  getSentRequests as listSentRequests,
} from './friendship.service.js';

export async function sendFriendRequest(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { addresseeId } = req.body;

    if (userId === addresseeId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    const friendship = await sendRequest(userId, addresseeId);
    return res.json(friendship);
  } catch (error: any) {
    console.error('[FriendshipController] Error sending request:', error);
    return res.status(400).json({ error: error.message });
  }
}

export async function acceptFriendRequest(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const friendship = await acceptRequest(userId, id);
    return res.json(friendship);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function rejectFriendRequest(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const friendship = await rejectRequest(userId, id);
    return res.json(friendship);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function getFriends(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const friends = await listFriends(userId);
    return res.json(friends);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getPendingRequests(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const requests = await listPendingRequests(userId);
    return res.json(requests);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getSentRequests(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const requests = await listSentRequests(userId);
    return res.json(requests);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

