

import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../middleware/admin-auth.middleware.js';
import {
  getOverview,
  getItineraryStats,
  getUserStats,
  listUsers,
  getCategoryStats,
  getEngagement,
} from './admin.controller.js';
import { validate } from '../../middleware/validate.js';
import { listUsersSchema, userStatsSchema } from './admin.schema.js';

const router = Router();


router.use(authenticate);
router.use(requireAdmin);


router.get('/stats/overview', getOverview);


router.get('/stats/itineraries', getItineraryStats);


router.get('/stats/users', validate(userStatsSchema, 'query'), getUserStats);
router.get('/users', validate(listUsersSchema, 'query'), listUsers);


router.get('/stats/categories', getCategoryStats);


router.get('/stats/engagement', getEngagement);

export default router;
