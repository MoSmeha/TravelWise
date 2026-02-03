

import { adminProvider } from './admin.provider.js';
import {
  AdminUserListItem,
} from './admin.contract.js';



export interface OverviewStats {
  totalUsers: number;
  totalItineraries: number;
  totalPosts: number;
  totalFriendships: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  verifiedUsers: number;
  unverifiedUsers: number;
}

export interface CountryBreakdown {
  country: string;
  count: number;
}

export interface TravelStyleBreakdown {
  style: string;
  count: number;
}

export interface UserGrowth {
  date: string;
  count: number;
}

export interface PaginatedUsers {
  users: AdminUserListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}



export async function getOverviewStats(): Promise<OverviewStats> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalItineraries,
    totalPosts,
    totalFriendships,
    newUsersLast7Days,
    newUsersLast30Days,
    verifiedUsers,
  ] = await Promise.all([
    adminProvider.getTotalUserCount(),
    adminProvider.getTotalItineraryCount(),
    adminProvider.getTotalPostCount(),
    adminProvider.getTotalFriendshipCount(),
    adminProvider.getUserCountSince(sevenDaysAgo),
    adminProvider.getUserCountSince(thirtyDaysAgo),
    adminProvider.getVerifiedUserCount(),
  ]);

  return {
    totalUsers,
    totalItineraries,
    totalPosts,
    totalFriendships,
    newUsersLast7Days,
    newUsersLast30Days,
    verifiedUsers,
    unverifiedUsers: totalUsers - verifiedUsers,
  };
}



export async function getItinerariesByCountry(): Promise<CountryBreakdown[]> {
  const results = await adminProvider.getItinerariesGroupedByCountry();

  return results.map((r) => ({
    country: r.field,
    count: r.count,
  }));
}

export async function getTravelStyleBreakdown(): Promise<TravelStyleBreakdown[]> {
  const itineraries = await adminProvider.getAllItineraryStyles();


  const styleCounts: Record<string, number> = {};
  
  for (const itinerary of itineraries) {
    for (const style of itinerary.travelStyles) {
      styleCounts[style] = (styleCounts[style] || 0) + 1;
    }
  }


  return Object.entries(styleCounts)
    .map(([style, count]) => ({ style, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export async function getBudgetDistribution(): Promise<{ range: string; count: number }[]> {
  const itineraries = await adminProvider.getAllItineraryBudgets();

  const ranges = [
    { min: 0, max: 500, label: '$0-500' },
    { min: 500, max: 1000, label: '$500-1000' },
    { min: 1000, max: 2000, label: '$1000-2000' },
    { min: 2000, max: 5000, label: '$2000-5000' },
    { min: 5000, max: Infinity, label: '$5000+' },
  ];

  const distribution = ranges.map((range) => ({
    range: range.label,
    count: itineraries.filter(
      (i) => i.budgetUSD >= range.min && i.budgetUSD < range.max
    ).length,
  }));

  return distribution;
}



export async function getUserGrowth(days: number = 30): Promise<UserGrowth[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const users = await adminProvider.getUsersCreatedSince(startDate);


  const growthMap: Record<string, number> = {};
  

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    growthMap[dateStr] = 0;
  }


  for (const user of users) {
    const dateStr = user.createdAt.toISOString().split('T')[0];
    if (growthMap[dateStr] !== undefined) {
      growthMap[dateStr]++;
    }
  }

  return Object.entries(growthMap).map(([date, count]) => ({ date, count }));
}

export async function getUsers(
  page: number = 1,
  pageSize: number = 20,
  search?: string
): Promise<PaginatedUsers> {
  const skip = (page - 1) * pageSize;

  const { users, total } = await adminProvider.getUsersPaginated(skip, pageSize, search);

  return {
    users,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}



export async function getLocationCategoryBreakdown(): Promise<{ category: string; count: number }[]> {
  const results = await adminProvider.getPlacesGroupedByCategory();

  return results.map((r) => ({
    category: r.field,
    count: r.count,
  }));
}



export async function getEngagementStats(): Promise<{
  totalLikes: number;
  totalComments: number;
  notificationsByType: { type: string; count: number }[];
}> {
  const [totalLikes, totalComments, notificationGroups] = await Promise.all([
    adminProvider.getTotalLikeCount(),
    adminProvider.getTotalCommentCount(),
    adminProvider.getNotificationsGroupedByType(),
  ]);

  return {
    totalLikes,
    totalComments,
    notificationsByType: notificationGroups.map((n) => ({
      type: n.field,
      count: n.count,
    })),
  };
}
