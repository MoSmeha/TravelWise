

import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import {
  getOverviewStats,
  getItinerariesByCountry,
  getTravelStyleBreakdown,
  getBudgetDistribution,
  getUserGrowth,
  getUsers,
  getLocationCategoryBreakdown,
  getEngagementStats,
} from './admin.service.js';


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

export async function getUserStats(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { days } = req.query as unknown as { days: number };
    const growth = await getUserGrowth(days);

    res.json({ growth });
  } catch (error: any) {
    console.error('Admin user stats error:', error.message);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
}

export async function listUsers(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const { page, pageSize, search } = req.query as unknown as { page: number; pageSize: number; search?: string };

    const result = await getUsers(page, pageSize, search);
    res.json(result);
  } catch (error: any) {
    console.error('Admin list users error:', error.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}




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
