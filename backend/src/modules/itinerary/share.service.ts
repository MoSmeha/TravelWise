import { SharePermission, ShareStatus, NotificationType } from '../../generated/prisma/client.js';
import { itineraryShareProvider } from './share.provider.js';
import { IItineraryShareProvider } from './share.contract.js';
import { socketService } from '../shared/socket.service.js';
import prisma from '../shared/lib/prisma.js';


export async function inviteUser(
  itineraryId: string,
  userId: string,
  invitedBy: string,
  permission: SharePermission = SharePermission.VIEWER,
  provider: IItineraryShareProvider = itineraryShareProvider
) {

  const share = await provider.createShare({
    itineraryId,
    userId,
    invitedBy,
    permission,
  });


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


  socketService.emitToUser(userId, 'notification:new', {
    type: NotificationType.ITINERARY_SHARED,
    title: 'Itinerary Shared',
    message: `${(share as any).inviter.name} shared an itinerary with you`,
    shareId: share.id,
  });

  return share;
}


export async function acceptInvitation(
  shareId: string,
  userId: string,
  provider: IItineraryShareProvider = itineraryShareProvider
) {

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


  const updatedShare = await provider.updateShareStatus({
    shareId,
    status: ShareStatus.ACCEPTED,
  });


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


  socketService.emitToUser(share.invitedBy, 'notification:new', {
    type: NotificationType.ITINERARY_ACCEPTED,
    title: 'Invitation Accepted',
    message: `${(updatedShare as any).user.name} accepted your itinerary invitation`,
  });

  return updatedShare;
}


export async function rejectInvitation(
  shareId: string,
  userId: string,
  provider: IItineraryShareProvider = itineraryShareProvider
) {

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


  return provider.updateShareStatus({
    shareId,
    status: ShareStatus.REJECTED,
  });
}


export async function removeCollaborator(
  shareId: string,
  requestingUserId: string,
  provider: IItineraryShareProvider = itineraryShareProvider
) {
  const share = await provider.getShareById(shareId);
  
  if (!share) {
    throw new Error('Share not found');
  }


  const isOwner = await provider.isOwner(share.itineraryId, requestingUserId);
  
  if (!isOwner) {
    throw new Error('Only the owner can remove collaborators');
  }


  if (share.userId === requestingUserId) {
    throw new Error('Cannot remove yourself from the itinerary');
  }

  await provider.deleteShare(shareId);
}


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


  const isOwner = await provider.isOwner(share.itineraryId, requestingUserId);
  
  if (!isOwner) {
    throw new Error('Only the owner can update permissions');
  }

  return provider.updateSharePermission({
    shareId,
    permission: newPermission,
  });
}


export async function getCollaborators(
  itineraryId: string,
  userId: string,
  provider: IItineraryShareProvider = itineraryShareProvider
) {

  const permission = await provider.getUserPermission(itineraryId, userId);
  
  if (!permission) {
    throw new Error('No access to this itinerary');
  }

  return provider.getItineraryShares(itineraryId);
}


export async function getUserSharedItineraries(
  userId: string,
  status?: ShareStatus,
  provider: IItineraryShareProvider = itineraryShareProvider
) {
  return provider.getUserShares(userId, status);
}


export async function checkPermission(
  itineraryId: string,
  userId: string,
  provider: IItineraryShareProvider = itineraryShareProvider
) {
  return provider.getUserPermission(itineraryId, userId);
}


export function hasMinimumPermission(
  userPermission: SharePermission | null,
  requiredPermission: SharePermission
): boolean {
  if (!userPermission) return false;
  

  if (userPermission === SharePermission.OWNER) return true;
  

  if (requiredPermission === SharePermission.VIEWER) return true;
  
  return false;
}
