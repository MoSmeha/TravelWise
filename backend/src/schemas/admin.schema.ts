import { z } from 'zod';

export const userStatsSchema = z.object({
  days: z.coerce.number().int().min(1).default(30),
});

export const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});
