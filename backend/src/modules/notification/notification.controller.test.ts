import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContext, resetAllMocks } from '../../tests/setup.js';

vi.mock('./notification.service.js', () => ({
  getNotifications: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  getUnreadCount: vi.fn(),
}));

import * as NotificationController from './notification.controller.js';
import * as notificationService from './notification.service.js';

const mockNotification = { id: 'notif-123', type: 'FRIEND_REQUEST', read: false };

describe('Notification Controller', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('GET /api/notifications', () => {
    it('should return notifications', async () => {
      const { req, res } = createMockContext();
      req.query = {};

      vi.mocked(notificationService.getNotifications).mockResolvedValue([mockNotification] as any);

      await NotificationController.getNotifications(req, res);

      expect(res.json).toHaveBeenCalledWith([mockNotification]);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return unread count', async () => {
      const { req, res } = createMockContext();

      vi.mocked(notificationService.getUnreadCount).mockResolvedValue(5);

      await NotificationController.getUnreadCount(req, res);

      expect(res.json).toHaveBeenCalledWith({ count: 5 });
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    it('should mark as read', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'notif-123' };

      vi.mocked(notificationService.markAsRead).mockResolvedValue({ ...mockNotification, read: true } as any);

      await NotificationController.markAsRead(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('PUT /api/notifications/read-all', () => {
    it('should mark all as read', async () => {
      const { req, res } = createMockContext();

      vi.mocked(notificationService.markAllAsRead).mockResolvedValue({ count: 5 });

      await NotificationController.markAllAsRead(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });
});
