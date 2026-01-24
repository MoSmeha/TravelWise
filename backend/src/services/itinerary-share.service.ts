import { SharePermission, ShareStatus, NotificationType } from '../generated/prisma/client.js';
import { itineraryShareProvider } from '../providers/itinerary-share.provider.pg.js';
import { IItineraryShareProvider } from '../provider-contract/itinerary-share.provider-contract.js';
import { socketService } from './socket.service.js';
import prisma from '../lib/prisma.js';

/**
 * Invite a user to collaborate on an itinerary
 */
export async function inviteUser(
  itineraryId: string,
  userId: string,
  invitedBy: string,
  permission: SharePermission = SharePermission.VIEWER,
  provider: IItineraryShareProvider = itineraryShareProvider
) {
  // Create the share invitation
  const share = await provider.createShare({
    itineraryId,
    userId,
    invitedBy,
    permission,
  });

  // Create notification for the invited user
  await prisma.notification.create({
    data: {
      userId,
      type: NotificationType.ITINERARY_SHARED,
      title: 'Itinerary Shared',
      message: `${(share as any).inviter.name} shared an itinerary with you`,
      data: {
        shareId: share.id,
        itineraryId,
        inviterId: invitedBy,
      },
    },
  });

  // Emit real-time notification via Socket.io
  socketService.emitToUser(userId, 'notification:new', {
    type: NotificationType.ITINERARY_SHARED,
    title: 'Itinerary Shared',
    message: `${(share as any).inviter.name} shared an itinerary with you`,
    shareId: share.id,
  });

  return share;
}

/**
 * Accept an itinerary invitation
 */
export async function acceptInvitation(
  shareId: string,
  userId: string,
  provider: IItineraryShareProvider = itineraryShareProvider
) {
  // Verify the share belongs to this user
  const share = await provider.getShareById(shareId);
  
  if (!share) {
    throw new Error('Share not found');
  }

  if (share.userId !== userId) {
    throw new Error('Unauthorized to accept this invitation');
  }

  if (share.status !== ShareStatus.PENDING) {
    throw new Error('Invitation is not pending');
  }

  // Update status to accepted
  const updatedShare = await provider.updateShareStatus({
    shareId,
    status: ShareStatus.ACCEPTED,
  });

  // Notify the inviter
  await prisma.notification.create({
    data: {
      userId: share.invitedBy,
      type: NotificationType.ITINERARY_ACCEPTED,
      title: 'Invitation Accepted',
      message: `${(updatedShare as any).user.name} accepted your itinerary invitation`,
      data: {
        shareId: updatedShare.id,
        itineraryId: updatedShare.itineraryId,
        acceptedBy: userId,
      },
    },
  });

  // Emit real-time notification
  socketService.emitToUser(share.invitedBy, 'notification:new', {
    type: NotificationType.ITINERARY_ACCEPTED,
    title: 'Invitation Accepted',
    message: `${(updatedShare as any).user.name} accepted your itinerary invitation`,
  });

  return updatedShare;
}

/**
 * Reject an itinerary invitation
 */
export async function rejectInvitation(
  shareId: string,
  userId: string,
  provider: IItineraryShareProvider = itineraryShareProvider
) {
  // Verify the share belongs to this user
  const share = await provider.getShareById(shareId);
  
  if (!share) {
    throw new Error('Share not found');
  }

  if (share.userId !== userId) {
    throw new Error('Unauthorized to reject this invitation');
  }

  if (share.status !== ShareStatus.PENDING) {
    throw new Error('Invitation is not pending');
  }

  // Update status to rejected
  return provider.updateShareStatus({
    shareId,
    status: ShareStatus.REJECTED,
  });
}

/**
 * Remove a collaborator from an itinerary
 */
export async function removeCollaborator(
  shareId: string,
  requestingUserId: string,
  provider: IItineraryShareProvider = itineraryShareProvider
) {
  const share = await provider.getShareById(shareId);
  
  if (!share) {
    throw new Error('Share not found');
  }

  // Only the owner can remove collaborators
  const isOwner = await provider.isOwner(share.itineraryId, requestingUserId);
  
  if (!isOwner) {
    throw new Error('Only the owner can remove collaborators');
  }

  // Cannot remove yourself
  if (share.userId === requestingUserId) {
    throw new Error('Cannot remove yourself from the itinerary');
  }

  await provider.deleteShare(shareId);
}

/**
 * Update collaborator permission
 */
export async function updatePermission(
  shareId: string,
  newPermission: SharePermission,
  requestingUserId: string,
  provider: IItineraryShareProvider = itineraryShareProvider
) {
  const share = await provider.getShareById(shareId);
  
  if (!share) {
    throw new Error('Share not found');
  }

  // Only the owner can update permissions
  const isOwner = await provider.isOwner(share.itineraryId, requestingUserId);
  
  if (!isOwner) {
    throw new Error('Only the owner can update permissions');
  }

  return provider.updateSharePermission({
    shareId,
    permission: newPermission,
  });
}

/**
 * Get all collaborators for an itinerary
 */
export async function getCollaborators(
  itineraryId: string,
  userId: string,
  provider: IItineraryShareProvider = itineraryShareProvider
) {
  // Check if user has access to this itinerary
  const permission = await provider.getUserPermission(itineraryId, userId);
  
  if (!permission) {
    throw new Error('No access to this itinerary');
  }

  return provider.getItineraryShares(itineraryId);
}

/**
 * Get all shared itineraries for a user
 */
export async function getUserSharedItineraries(
  userId: string,
  status?: ShareStatus,
  provider: IItineraryShareProvider = itineraryShareProvider
) {
  return provider.getUserShares(userId, status);
}

/**
 * Check user's permission level for an itinerary
 */
export async function checkPermission(
  itineraryId: string,
  userId: string,
  provider: IItineraryShareProvider = itineraryShareProvider
) {
  return provider.getUserPermission(itineraryId, userId);
}

/**
 * Verify user has minimum required permission
 */
export function hasMinimumPermission(
  userPermission: SharePermission | null,
  requiredPermission: SharePermission
): boolean {
  if (!userPermission) return false;
  
  // OWNER has all permissions
  if (userPermission === SharePermission.OWNER) return true;
  
  // VIEWER only has viewer permissions
  if (requiredPermission === SharePermission.VIEWER) return true;
  
  return false;
}
