import { useQueries } from '@tanstack/react-query';
import { client } from '../utils/client';
import {
  OverviewStatsSchema,
  ItineraryStatsSchema,
  UserStatsSchema,
  EngagementStatsSchema,
} from '../types/schemas';

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
        queryFn: async () => {
          const { data } = await client.get('/admin/stats/overview');
          return OverviewStatsSchema.parse(data);
        },
      },
      {
        queryKey: ['stats', 'itineraries'],
        queryFn: async () => {
          const { data } = await client.get('/admin/stats/itineraries');
          return ItineraryStatsSchema.parse(data);
        },
      },
      {
        queryKey: ['stats', 'users', 14],
        queryFn: async () => {
          const { data } = await client.get('/admin/stats/users?days=14');
          return UserStatsSchema.parse(data);
        },
      },
      {
        queryKey: ['stats', 'engagement'],
        queryFn: async () => {
          const { data } = await client.get('/admin/stats/engagement');
          return EngagementStatsSchema.parse(data);
        },
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
