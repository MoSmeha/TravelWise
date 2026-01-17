import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { friendshipService } from '../services/friendship.service';

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
}
