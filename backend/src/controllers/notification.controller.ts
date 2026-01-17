import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { notificationService } from '../services/notification.service';

export class NotificationController {
  
  static async getNotifications(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const unreadOnly = req.query.unread === 'true';
      
      const notifications = await notificationService.getNotifications(userId, unreadOnly);
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async markAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const notification = await notificationService.markAsRead(id, userId);
      res.json(notification);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      await notificationService.markAllAsRead(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const count = await notificationService.getUnreadCount(userId);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
