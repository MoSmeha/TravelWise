import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from './notification.controller.js';
import { validate } from '../../middleware/validate.js';
import { getNotificationsSchema, notificationIdSchema } from './notification.schema.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', validate(getNotificationsSchema, 'query'), getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/:id/read', validate(notificationIdSchema, 'params'), markAsRead);
router.put('/read-all', markAllAsRead);

export default router;
