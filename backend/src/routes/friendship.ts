import { Router } from 'express';
import { FriendshipController } from '../controllers/friendship.controller';

const router = Router();

router.post('/request', FriendshipController.sendFriendRequest);
router.put('/request/:id/accept', FriendshipController.acceptFriendRequest);
router.put('/request/:id/reject', FriendshipController.rejectFriendRequest);
router.get('/', FriendshipController.getFriends);
router.get('/requests/pending', FriendshipController.getPendingRequests);
router.get('/requests/sent', FriendshipController.getSentRequests);

export default router;
