import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContext, resetAllMocks } from './setup.js';

vi.mock('../services/admin.service.js', () => ({
  getOverviewStats: vi.fn(),
  getItinerariesByCountry: vi.fn(),
  getTravelStyleBreakdown: vi.fn(),
  getBudgetDistribution: vi.fn(),
  getUserGrowth: vi.fn(),
  getUsers: vi.fn(),
  getLocationCategoryBreakdown: vi.fn(),
  getEngagementStats: vi.fn(),
}));

import * as AdminController from '../controllers/admin.controller.js';
import * as adminService from '../services/admin.service.js';

describe('Admin Controller', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('GET /api/admin/overview', () => {
    it('should return overview stats', async () => {
      const { req, res } = createMockContext();

      vi.mocked(adminService.getOverviewStats).mockResolvedValue({
        totalUsers: 100,
        totalItineraries: 50,
        totalPosts: 25,
        totalFriendships: 30,
        newUsersLast7Days: 10,
        newUsersLast30Days: 20,
        verifiedUsers: 80,
        unverifiedUsers: 20,
      });

      await AdminController.getOverview(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it('should return 500 on error', async () => {
      const { req, res } = createMockContext();

      vi.mocked(adminService.getOverviewStats).mockRejectedValue(new Error('DB error'));

      await AdminController.getOverview(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('GET /api/admin/itinerary-stats', () => {
    it('should return itinerary statistics', async () => {
      const { req, res } = createMockContext();

      vi.mocked(adminService.getItinerariesByCountry).mockResolvedValue([]);
      vi.mocked(adminService.getTravelStyleBreakdown).mockResolvedValue([]);
      vi.mocked(adminService.getBudgetDistribution).mockResolvedValue([]);

      await AdminController.getItineraryStats(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('GET /api/admin/users', () => {
    it('should return paginated users', async () => {
      const { req, res } = createMockContext();
      req.query = { page: 1, pageSize: 10 };

      vi.mocked(adminService.getUsers).mockResolvedValue({
        users: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });

      await AdminController.listUsers(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });
});
