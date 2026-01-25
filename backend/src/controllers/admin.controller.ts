/**
 * Admin Controller
 * Handles admin dashboard API endpoints
 */

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  getOverviewStats,
  getItinerariesByCountry,
  getTravelStyleBreakdown,
  getBudgetDistribution,
  getUserGrowth,
  getUsers,
  getLocationCategoryBreakdown,
  getEngagementStats,
} from '../services/admin.service.js';

// ============================================================================
// Overview
// ============================================================================

/**
 * GET /api/admin/stats/overview
 * Get high-level KPI statistics
 */
export async function getOverview(
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const stats = await getOverviewStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Admin overview error:', error.message);
    res.status(500).json({ error: 'Failed to fetch overview stats' });
  }
}

// ============================================================================
// Itinerary Statistics
// ============================================================================

/**
 * GET /api/admin/stats/itineraries
 * Get itinerary-related statistics
 */
export async function getItineraryStats(
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const [byCountry, byTravelStyle, budgetDistribution] = await Promise.all([
      getItinerariesByCountry(),
      getTravelStyleBreakdown(),
      getBudgetDistribution(),
    ]);

    res.json({
      byCountry,
      byTravelStyle,
      budgetDistribution,
    });
  } catch (error: any) {
    console.error('Admin itinerary stats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch itinerary stats' });
  }
}

// ============================================================================
// User Statistics
// ============================================================================

/**
 * GET /api/admin/stats/users
 * Get user growth and demographics
 */
export async function getUserStats(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const growth = await getUserGrowth(days);

    res.json({ growth });
  } catch (error: any) {
    console.error('Admin user stats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
}

/**
 * GET /api/admin/users
 * Get paginated user list
 */
export async function listUsers(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string | undefined;

    const result = await getUsers(page, pageSize, search);
    res.json(result);
  } catch (error: any) {
    console.error('Admin list users error:', error.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

// ============================================================================
// Category Statistics
// ============================================================================

/**
 * GET /api/admin/stats/categories
 * Get location category breakdown
 */
export async function getCategoryStats(
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const categories = await getLocationCategoryBreakdown();
    res.json({ categories });
  } catch (error: any) {
    console.error('Admin category stats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch category stats' });
  }
}

// ============================================================================
// Engagement Statistics
// ============================================================================

/**
 * GET /api/admin/stats/engagement
 * Get engagement metrics (likes, comments, notifications)
 */
export async function getEngagement(
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const engagement = await getEngagementStats();
    res.json(engagement);
  } catch (error: any) {
    console.error('Admin engagement stats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch engagement stats' });
  }
}
