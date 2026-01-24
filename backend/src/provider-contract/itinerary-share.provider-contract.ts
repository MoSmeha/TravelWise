import { SharePermission, ShareStatus, ItineraryShare } from '../generated/prisma/client.js';

export interface CreateShareParams {
  itineraryId: string;
  userId: string;
  invitedBy: string;
  permission: SharePermission;
}

export interface UpdateShareStatusParams {
  shareId: string;
  status: ShareStatus;
}

export interface UpdateSharePermissionParams {
  shareId: string;
  permission: SharePermission;
}

export interface IItineraryShareProvider {
  /**
   * Create a new itinerary share (invitation)
   */
  createShare(params: CreateShareParams): Promise<ItineraryShare>;

  /**
   * Get a share by ID
   */
  getShareById(shareId: string): Promise<ItineraryShare | null>;

  /**
   * Get all shares for an itinerary
   */
  getItineraryShares(itineraryId: string): Promise<ItineraryShare[]>;

  /**
   * Get all shares for a user (optionally filtered by status)
   */
  getUserShares(userId: string, status?: ShareStatus): Promise<ItineraryShare[]>;

  /**
   * Update share status (accept/reject)
   */
  updateShareStatus(params: UpdateShareStatusParams): Promise<ItineraryShare>;

  /**
   * Update share permission level
   */
  updateSharePermission(params: UpdateSharePermissionParams): Promise<ItineraryShare>;

  /**
   * Delete a share (remove collaborator)
   */
  deleteShare(shareId: string): Promise<void>;

  /**
   * Get user's permission level for an itinerary
   * Returns null if user has no access
   */
  getUserPermission(itineraryId: string, userId: string): Promise<SharePermission | null>;

  /**
   * Check if user is owner of itinerary (either created it or has OWNER permission via share)
   */
  isOwner(itineraryId: string, userId: string): Promise<boolean>;
}
