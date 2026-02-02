



export interface AdminUserListItem {
  id: string;
  email: string;
  name: string;
  username: string;
  avatarUrl: string;
  emailVerified: boolean;
  isAdmin: boolean;
  createdAt: Date;
  itineraryCount: number;
  postCount: number;
}

export interface CountResult {
  field: string;
  count: number;
}

export interface UserGrowthData {
  createdAt: Date;
}

export interface ItineraryWithStyles {
  travelStyles: string[];
}

export interface ItineraryWithBudget {
  budgetUSD: number;
}



export interface IAdminProvider {
  getTotalUserCount(): Promise<number>;
  getVerifiedUserCount(): Promise<number>;
  getUserCountSince(date: Date): Promise<number>;
  getUsersCreatedSince(date: Date): Promise<UserGrowthData[]>;


  getTotalItineraryCount(): Promise<number>;
  getItinerariesGroupedByCountry(): Promise<CountResult[]>;
  getAllItineraryStyles(): Promise<ItineraryWithStyles[]>;
  getAllItineraryBudgets(): Promise<ItineraryWithBudget[]>;


  getTotalPostCount(): Promise<number>;
  getTotalFriendshipCount(): Promise<number>;
  getTotalLikeCount(): Promise<number>;
  getTotalCommentCount(): Promise<number>;
  getNotificationsGroupedByType(): Promise<CountResult[]>;


  getPlacesGroupedByCategory(): Promise<CountResult[]>;


  getUsersPaginated(
    skip: number,
    take: number,
    search?: string
  ): Promise<{ users: AdminUserListItem[]; total: number }>;
}
