import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import { searchUsers as findUsers } from '../friendship/friendship.service.js';
import { updateAvatar as updateUserAvatar, getUserById as fetchUser, sanitizeUser } from './user.service.js';
import { socketService } from '../shared/socket.service.js';

export async function searchUsers(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { q } = req.query as unknown as { q: string };

    const users = await findUsers(q, userId);
    
    // Sanitize user data before returning
    const sanitizedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
    }));

    return res.json(sanitizedUsers);
  } catch (error: any) {
    console.error('[UsersController] Error searching users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


export async function getOnlineStatus(req: AuthRequest, res: Response) {
  try {
    const { userIds } = req.query as unknown as { userIds: string[] };
    
    const onlineStatus: Record<string, boolean> = {};
    for (const userId of userIds) {
      onlineStatus[userId.trim()] = socketService.isUserOnline(userId.trim());
    }

    return res.json(onlineStatus);
  } catch (error: any) {
    console.error('[UsersController] Error getting online status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


export async function updateAvatar(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const updatedUser = await updateUserAvatar(userId, req.file.buffer);
    
    return res.json({
      message: 'Avatar updated successfully',
      avatarUrl: updatedUser.avatarUrl,
    });
  } catch (error: any) {
    console.error('[UsersController] Error updating avatar:', error);
    return res.status(500).json({ error: 'Failed to update avatar' });
  }
}


export async function getMe(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const user = await fetchUser(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(sanitizeUser(user));
  } catch (error: any) {
    console.error('[UsersController] Error getting user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
