import { Router } from 'express';
import { UsersController } from '../controllers/users.controller.js';
import { avatarUpload } from '../middleware/upload.middleware.js';

const router = Router();

router.get('/search', UsersController.searchUsers);
router.get('/online-status', UsersController.getOnlineStatus);
router.put('/avatar', avatarUpload, UsersController.updateAvatar);

export default router;
