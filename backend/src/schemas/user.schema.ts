import { z } from 'zod';

export const searchUsersSchema = z.object({
  q: z.string().min(1),
});

export const onlineStatusSchema = z.object({
  userIds: z.string().transform((val) => val.split(',').map((id) => id.trim()).filter((id) => id.length > 0)),
});
