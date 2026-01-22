/**
 * Notification Controller Tests
 * Tests for notification endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContext, resetAllMocks } from './setup.js';

// Mock the notification service
// Mock the notification service
vi.mock('../../services/notification.service.js', () => ({
  getNotifications: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  getUnreadCount: vi.fn(),
}));

import { NotificationController } from '../../controllers/notification.controller.js';
import * as notificationService from '../../services/notification.service.js';

const mockNotification = {
  id: 'notif-123',
  userId: 'user-123',
  type: 'FRIEND_REQUEST',
  title: 'New Friend Request',
  message: 'John sent you a friend request',
  read: false,
  metadata: {},
  createdAt: new Date(),
};

describe('Notification Controller', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('GET /api/notifications', () => {
    it('should return all notifications', async () => {
      const { req, res } = createMockContext();
      req.query = {};

      const notifications = [mockNotification];
      vi.mocked(notificationService.getNotifications).mockResolvedValue(notifications as any);

      await NotificationController.getNotifications(req, res);

      expect(notificationService.getNotifications).toHaveBeenCalledWith(
        req.user.userId,
        false
      );
      expect(res.json).toHaveBeenCalledWith(notifications);
    });

    it('should return only unread notifications when filtered', async () => {
      const { req, res } = createMockContext();
      req.query = { unread: 'true' };

      const notifications = [mockNotification];
      vi.mocked(notificationService.getNotifications).mockResolvedValue(notifications as any);

      await NotificationController.getNotifications(req, res);

      expect(notificationService.getNotifications).toHaveBeenCalledWith(
        req.user.userId,
        true
      );
      expect(res.json).toHaveBeenCalledWith(notifications);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return unread count', async () => {
      const { req, res } = createMockContext();

      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(5);

      await NotificationController.getUnreadCount(req, res);

      expect(notificationService.getUnreadCount).toHaveBeenCalledWith(req.user.userId);
      expect(res.json).toHaveBeenCalledWith({ count: 5 });
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'notif-123' };

      const readNotification = { ...mockNotification, read: true };
      vi.mocked(notificationService.markAsRead).mockResolvedValue(readNotification as any);

      await NotificationController.markAsRead(req, res);

      expect(notificationService.markAsRead).toHaveBeenCalledWith(
        'notif-123',
        req.user.userId
      );
      expect(res.json).toHaveBeenCalledWith(readNotification);
    });

    it('should return 400 for invalid notification', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'invalid-id' };

      vi.mocked(notificationService.markAsRead).mockRejectedValue(
        new Error('Notification not found')
      );

      await NotificationController.markAsRead(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Notification not found' });
    });
  });

  describe('PUT /api/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      const { req, res } = createMockContext();

      vi.mocked(notificationService.markAllAsRead).mockResolvedValue({ count: 5 });

      await NotificationController.markAllAsRead(req, res);

      expect(notificationService.markAllAsRead).toHaveBeenCalledWith(req.user.userId);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });
});
