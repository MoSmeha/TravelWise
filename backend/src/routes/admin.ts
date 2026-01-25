/**
 * Admin Routes
 * Protected routes for admin dashboard functionality
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin-auth.middleware.js';
import {
  getOverview,
  getItineraryStats,
  getUserStats,
  listUsers,
  getCategoryStats,
  getEngagement,
} from '../controllers/admin.controller.js';

const router = Router();

// All admin routes require authentication + admin privileges
router.use(authenticate);
router.use(requireAdmin);

// Overview & KPIs
router.get('/stats/overview', getOverview);

// Itinerary statistics
router.get('/stats/itineraries', getItineraryStats);

// User statistics & management
router.get('/stats/users', getUserStats);
router.get('/users', listUsers);

// Category breakdown
router.get('/stats/categories', getCategoryStats);

// Engagement metrics
router.get('/stats/engagement', getEngagement);

export default router;
