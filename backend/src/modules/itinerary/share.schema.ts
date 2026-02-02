import { z } from 'zod';
import { SharePermission, ShareStatus } from '../../generated/prisma/client.js';

export const CreateShareSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  permission: z.nativeEnum(SharePermission).optional().default(SharePermission.VIEWER),
});

export type CreateShareInput = z.infer<typeof CreateShareSchema>;

export const UpdateShareStatusSchema = z.object({
  status: z.nativeEnum(ShareStatus),
});

export type UpdateShareStatusInput = z.infer<typeof UpdateShareStatusSchema>;

export const UpdateSharePermissionSchema = z.object({
  permission: z.nativeEnum(SharePermission),
});

export type UpdateSharePermissionInput = z.infer<typeof UpdateSharePermissionSchema>;
