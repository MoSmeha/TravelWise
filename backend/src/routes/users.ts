import { Router } from 'express';
import {
  searchUsers,
  getOnlineStatus,
  updateAvatar,
} from '../controllers/users.controller.js';
import { avatarUpload } from '../middleware/upload.middleware.js';

const router = Router();

router.get('/search', searchUsers);
router.get('/online-status', getOnlineStatus);
router.put('/avatar', avatarUpload, updateAvatar);

export default router;
