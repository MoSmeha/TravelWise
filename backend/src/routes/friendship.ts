import { Router } from 'express';
import { FriendshipController } from '../controllers/friendship.controller.js';
import { validate } from '../middleware/validate.js';
import {
  sendFriendRequestSchema,
  friendshipIdParamSchema,
} from '../schemas/friendship.schema.js';

const router = Router();

router.post('/request', validate(sendFriendRequestSchema), FriendshipController.sendFriendRequest);
router.put('/request/:id/accept', validate(friendshipIdParamSchema, 'params'), FriendshipController.acceptFriendRequest);
router.put('/request/:id/reject', validate(friendshipIdParamSchema, 'params'), FriendshipController.rejectFriendRequest);
router.get('/', FriendshipController.getFriends);
router.get('/requests/pending', FriendshipController.getPendingRequests);
router.get('/requests/sent', FriendshipController.getSentRequests);

export default router;
