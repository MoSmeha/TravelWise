import { Router } from 'express';
import {
  searchUsers,
  getOnlineStatus,
  updateAvatar,
} from '../modules/user/user.controller.js';
import { validate } from '../middleware/validate.js';
import { onlineStatusSchema, searchUsersSchema } from '../modules/user/user.schema.js';
import { avatarUpload } from '../middleware/upload.middleware.js';

const router = Router();

router.get('/search', validate(searchUsersSchema, 'query'), searchUsers);
router.get('/online-status', validate(onlineStatusSchema, 'query'), getOnlineStatus);
router.put('/avatar', avatarUpload, updateAvatar);

export default router;
