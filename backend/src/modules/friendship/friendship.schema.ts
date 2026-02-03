

import { z } from 'zod';


export const sendFriendRequestSchema = z.object({
  addresseeId: z.string().cuid('Invalid user ID format'),
});


export const friendshipIdParamSchema = z.object({
  id: z.string().cuid('Invalid friendship ID format'),
});


export type SendFriendRequestInput = z.infer<typeof sendFriendRequestSchema>;
export type FriendshipIdParam = z.infer<typeof friendshipIdParamSchema>;
