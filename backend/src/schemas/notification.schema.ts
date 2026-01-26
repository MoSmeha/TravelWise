import { z } from 'zod';

export const getNotificationsSchema = z.object({
  unread: z.enum(['true', 'false']).transform((val) => val === 'true').optional(),
});

export const notificationIdSchema = z.object({
  id: z.string().uuid(),
});
