import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import {
  getNotifications as listNotifications,
  markAsRead as markOneAsRead,
  markAllAsRead as markAll,
  getUnreadCount as countUnread
} from '../services/notification.service.js';

export async function getNotifications(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { unread } = req.query;
    
    const notifications = await listNotifications(userId, unread === 'true');
    res.json(notifications);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function markAsRead(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const notification = await markOneAsRead(id, userId);
    res.json(notification);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function markAllAsRead(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    await markAll(userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getUnreadCount(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const count = await countUnread(userId);
    res.json({ count });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
