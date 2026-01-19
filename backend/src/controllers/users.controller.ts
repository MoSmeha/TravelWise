import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { friendshipService } from '../services/friendship.service.js';
import { socketService } from '../services/socket.service.js';

export class UsersController {
  
  static async searchUsers(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const query = req.query.q as string;

      if (!query) {
        return res.json([]);
      }

      const users = await friendshipService.searchUsers(query, userId);
      
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
}
