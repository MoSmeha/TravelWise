import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { searchUsers } from '../services/friendship.service.js';
import { updateAvatar, getUserById, sanitizeUser } from '../services/user.service.js';
import { socketService } from '../services/socket.service.js';

export class UsersController {
  
  static async searchUsers(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const query = req.query.q as string;

      if (!query) {
        return res.json([]);
      }

      const users = await searchUsers(query, userId);
      
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

  /**
   * Get online status for multiple users
   * Query param: userIds (comma-separated)
   */
  static async getOnlineStatus(req: AuthRequest, res: Response) {
    try {
      const userIdsParam = req.query.userIds as string;
      
      if (!userIdsParam) {
        return res.json({});
      }

      const userIds = userIdsParam.split(',').filter(id => id.trim());
      
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

  /**
   * Update user's avatar/profile picture
   * Expects multipart/form-data with 'avatar' field
   */
  static async updateAvatar(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const updatedUser = await updateAvatar(userId, req.file.buffer);
      
      return res.json({
        message: 'Avatar updated successfully',
        avatarUrl: updatedUser.avatarUrl,
      });
    } catch (error: any) {
      console.error('[UsersController] Error updating avatar:', error);
      return res.status(500).json({ error: 'Failed to update avatar' });
    }
  }

  /**
   * Get current user's profile
   */
  static async getMe(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const user = await getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json(sanitizeUser(user));
    } catch (error: any) {
      console.error('[UsersController] Error getting user:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
