import { Friendship, User } from '../../generated/prisma/client.js';
import { friendshipProvider } from './friendship.provider.js';
import { createNotification } from '../notification/notification.service.js';


export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friendship> {

  const existing = await friendshipProvider.getFriendship(requesterId, addresseeId);
  if (existing) {
    if (existing.status === 'ACCEPTED') {
      throw new Error('Users are already friends');
    }
    if (existing.status === 'PENDING') {
      throw new Error('Friend request already pending');
    }
    // If REJECTED, we might allow resending, or handle logic here. 
    // For now, let's treat REJECTED as a state that can be updated to PENDING
    if (existing.status === 'REJECTED') {

        return friendshipProvider.updateFriendshipStatus(existing.id, 'PENDING');
    }
  }


  const friendship = await friendshipProvider.createFriendship(requesterId, addresseeId);


  const requesterName = (friendship as any).requester?.name || 'Someone';
  
  await createNotification(
    addresseeId,
    'FRIEND_REQUEST',
    'New Friend Request',
    `${requesterName} sent you a friend request`,
    { friendshipId: friendship.id, requesterId }
  );

  return friendship;
}


export async function acceptFriendRequest(userId: string, friendshipId: string): Promise<Friendship> {
  const friendship = await friendshipProvider.getFriendshipById(friendshipId);
  
  if (!friendship) {
    throw new Error('Friendship not found');
  }

  if (friendship.addresseeId !== userId) {
    throw new Error('Unauthorized to accept this request');
  }

  if (friendship.status !== 'PENDING') {
    throw new Error('Friend request is not pending');
  }

  const updatedFriendship = await friendshipProvider.updateFriendshipStatus(friendshipId, 'ACCEPTED');


  console.log(`[FRIENDSHIP] Accepting request. friendshipId: ${friendshipId}, requesterId: ${friendship.requesterId}, addresseeId: ${friendship.addresseeId}`);
  const accepterName = (updatedFriendship as any).addressee?.name || 'Someone';
  await createNotification(
    friendship.requesterId,
    'FRIEND_ACCEPTED',
    'Friend Request Accepted',
    `${accepterName} accepted your friend request`,
    { friendshipId: updatedFriendship.id, accepterId: userId }
  );

  return updatedFriendship;
}


export async function rejectFriendRequest(userId: string, friendshipId: string): Promise<Friendship> {
  const friendship = await friendshipProvider.getFriendshipById(friendshipId);
  
  if (!friendship) {
    throw new Error('Friendship not found');
  }

  if (friendship.addresseeId !== userId) {
    throw new Error('Unauthorized to reject this request');
  }


  return friendshipProvider.updateFriendshipStatus(friendshipId, 'REJECTED');
}


export async function getFriends(userId: string): Promise<User[]> {
  return friendshipProvider.getFriends(userId);
}


export async function getPendingRequests(userId: string) {
  return friendshipProvider.getPendingRequests(userId);
}


export async function getSentRequests(userId: string) {
  return friendshipProvider.getSentRequests(userId);
}


export async function searchUsers(query: string, currentUserId: string): Promise<User[]> {
  if (!query || query.length < 2) return [];
  
  const users = await friendshipProvider.searchUsers(query, currentUserId);
  

  return users;
}
