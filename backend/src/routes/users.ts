import { Router } from 'express';
import { UsersController } from '../controllers/users.controller';

const router = Router();

router.get('/search', UsersController.searchUsers);

export default router;
