/**
 * Friendship Zod Schemas
 * Validation schemas for friendship-related endpoints
 */

import { z } from 'zod';

/**
 * Schema for sending a friend request
 * POST /api/friends/request
 */
export const sendFriendRequestSchema = z.object({
  addresseeId: z.string().uuid('Invalid user ID format'),
});

/**
 * Schema for friendship ID in params
 * Used for accept/reject endpoints
 */
export const friendshipIdParamSchema = z.object({
  id: z.string().uuid('Invalid friendship ID format'),
});

// Type exports for use in controllers
export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>;
export type FriendshipIdParam = z.infer<typeof friendshipIdParamSchema>;
