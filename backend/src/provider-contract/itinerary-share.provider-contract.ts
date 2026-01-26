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

  createShare(params: CreateShareParams): Promise<ItineraryShare>;


  getShareById(shareId: string): Promise<ItineraryShare | null>;


  getItineraryShares(itineraryId: string): Promise<ItineraryShare[]>;


  getUserShares(userId: string, status?: ShareStatus): Promise<ItineraryShare[]>;


  updateShareStatus(params: UpdateShareStatusParams): Promise<ItineraryShare>;


  updateSharePermission(params: UpdateSharePermissionParams): Promise<ItineraryShare>;


  deleteShare(shareId: string): Promise<void>;


  getUserPermission(itineraryId: string, userId: string): Promise<SharePermission | null>;


  isOwner(itineraryId: string, userId: string): Promise<boolean>;
}
