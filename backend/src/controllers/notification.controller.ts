import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
} from '../services/notification.service.js';

export class NotificationController {
  
  static async getNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const unreadOnly = req.query.unread === 'true';
      
      const notifications = await getNotifications(userId, unreadOnly);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async markAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const notification = await markAsRead(id, userId);
      res.json(notification);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      await markAllAsRead(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const count = await getUnreadCount(userId);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
