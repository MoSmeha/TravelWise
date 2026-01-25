import { useQueries } from '@tanstack/react-query';
import { client } from '../utils/client';
import type {
  OverviewStats,
  ItineraryStats,
  UserStats,
  EngagementStats,
} from '../types/dashboard';

export function useDashboardStats() {
  const [
    overviewQuery,
    itineraryStatsQuery,
    userStatsQuery,
    engagementQuery
  ] = useQueries({
    queries: [
      {
        queryKey: ['stats', 'overview'],
        queryFn: async () => (await client.get<OverviewStats>('/admin/stats/overview')).data,
      },
      {
        queryKey: ['stats', 'itineraries'],
        queryFn: async () => (await client.get<ItineraryStats>('/admin/stats/itineraries')).data,
      },
      {
        queryKey: ['stats', 'users', 14],
        queryFn: async () => (await client.get<UserStats>('/admin/stats/users?days=14')).data,
      },
      {
        queryKey: ['stats', 'engagement'],
        queryFn: async () => (await client.get<EngagementStats>('/admin/stats/engagement')).data,
      },
    ],
  });

  const isLoading = 
    overviewQuery.isLoading ||
    itineraryStatsQuery.isLoading ||
    userStatsQuery.isLoading ||
    engagementQuery.isLoading;

  const error = 
    overviewQuery.error ||
    itineraryStatsQuery.error ||
    userStatsQuery.error ||
    engagementQuery.error;

  return {
    overview: overviewQuery.data || null,
    itineraryStats: itineraryStatsQuery.data || null,
    userStats: userStatsQuery.data || null,
    engagement: engagementQuery.data || null,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Failed to load stats') : null,
  };
}
