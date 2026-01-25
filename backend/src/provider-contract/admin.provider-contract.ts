/**
 * Admin Provider Contract
 * Interface for admin data access operations
 */

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Provider Interface
// ============================================================================

export interface IAdminProvider {
  // User counts
  getTotalUserCount(): Promise<number>;
  getVerifiedUserCount(): Promise<number>;
  getUserCountSince(date: Date): Promise<number>;
  getUsersCreatedSince(date: Date): Promise<UserGrowthData[]>;

  // Itinerary counts
  getTotalItineraryCount(): Promise<number>;
  getItinerariesGroupedByCountry(): Promise<CountResult[]>;
  getAllItineraryStyles(): Promise<ItineraryWithStyles[]>;
  getAllItineraryBudgets(): Promise<ItineraryWithBudget[]>;

  // Social counts
  getTotalPostCount(): Promise<number>;
  getTotalFriendshipCount(): Promise<number>;
  getTotalLikeCount(): Promise<number>;
  getTotalCommentCount(): Promise<number>;
  getNotificationsGroupedByType(): Promise<CountResult[]>;

  // Category counts
  getPlacesGroupedByCategory(): Promise<CountResult[]>;

  // User listing
  getUsersPaginated(
    skip: number,
    take: number,
    search?: string
  ): Promise<{ users: AdminUserListItem[]; total: number }>;
}
