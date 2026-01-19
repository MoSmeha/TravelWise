import { Router } from 'express';
import { UsersController } from '../controllers/users.controller.js';

const router = Router();

router.get('/search', UsersController.searchUsers);
router.get('/online-status', UsersController.getOnlineStatus);

export default router;
