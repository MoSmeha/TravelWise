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

export interface ItineraryStats {
  byCountry: { country: string; count: number }[];
  byTravelStyle: { style: string; count: number }[];
  budgetDistribution: { range: string; count: number }[];
}

export interface UserStats {
  growth: { date: string; count: number }[];
}

export interface EngagementStats {
  totalLikes: number;
  totalComments: number;
}
