import { z } from 'zod';



export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  username: z.string().optional(),
  avatarUrl: z.string().optional().nullable(),
  emailVerified: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  createdAt: z.string().optional(),
  itineraryCount: z.number().optional(),
  postCount: z.number().optional(),
});

export type User = z.infer<typeof UserSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserSchema,
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const UsersResponseSchema = z.object({
  users: z.array(UserSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export type UsersResponse = z.infer<typeof UsersResponseSchema>;



export const OverviewStatsSchema = z.object({
  totalUsers: z.number(),
  totalItineraries: z.number(),
  totalPosts: z.number(),
  totalFriendships: z.number(),
  newUsersLast7Days: z.number(),
  newUsersLast30Days: z.number(),
  verifiedUsers: z.number(),
  unverifiedUsers: z.number(),
});

export type OverviewStats = z.infer<typeof OverviewStatsSchema>;

export const ItineraryStatsSchema = z.object({
  byCountry: z.array(z.object({
    country: z.string(),
    count: z.number(),
  })),
  byTravelStyle: z.array(z.object({
    style: z.string(),
    count: z.number(),
  })),
  budgetDistribution: z.array(z.object({
    range: z.string(),
    count: z.number(),
  })),
});

export type ItineraryStats = z.infer<typeof ItineraryStatsSchema>;

export const UserStatsSchema = z.object({
  growth: z.array(z.object({
    date: z.string(),
    count: z.number(),
  })),
});

export type UserStats = z.infer<typeof UserStatsSchema>;

export const EngagementStatsSchema = z.object({
  totalLikes: z.number(),
  totalComments: z.number(),  notificationsByType: z.array(z.object({
    type: z.string(),
    count: z.number(),
  })).optional(),
});

export type EngagementStats = z.infer<typeof EngagementStatsSchema>;
