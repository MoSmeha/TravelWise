import { Router } from 'express';
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getPendingRequests,
  getSentRequests,
} from '../modules/friendship/friendship.controller.js';
import { validate } from '../middleware/validate.js';
import {
  sendFriendRequestSchema,
  friendshipIdParamSchema,
} from '../schemas/friendship.schema.js';

const router = Router();

router.post('/request', validate(sendFriendRequestSchema), sendFriendRequest);
router.put('/request/:id/accept', validate(friendshipIdParamSchema, 'params'), acceptFriendRequest);
router.put('/request/:id/reject', validate(friendshipIdParamSchema, 'params'), rejectFriendRequest);
router.get('/', getFriends);
router.get('/requests/pending', getPendingRequests);
router.get('/requests/sent', getSentRequests);

export default router;
