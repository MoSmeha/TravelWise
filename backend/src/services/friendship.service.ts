import { Friendship, User } from '../generated/prisma/client.js';
import { friendshipProvider } from '../providers/friendship.provider.pg.js';
import { createNotification } from './notification.service.js';

/**
 * Send a friend request
 */
export async function sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friendship> {
  // 1. Check if friendship already exists
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
        // Optionally update existing record to PENDING
        return friendshipProvider.updateFriendshipStatus(existing.id, 'PENDING');
    }
  }

  // 2. Create friendship record
  const friendship = await friendshipProvider.createFriendship(requesterId, addresseeId);

  // 3. Send notification
  // We need requester details for the notification message
  // Assuming friendship.requester is populated by the provider
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

/**
 * Accept a friend request
 */
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

  // Notify the requester
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

/**
 * Reject a friend request
 */
export async function rejectFriendRequest(userId: string, friendshipId: string): Promise<Friendship> {
  const friendship = await friendshipProvider.getFriendshipById(friendshipId);
  
  if (!friendship) {
    throw new Error('Friendship not found');
  }

  if (friendship.addresseeId !== userId) {
    throw new Error('Unauthorized to reject this request');
  }

  // We can either set status to REJECTED or delete the record.
  return friendshipProvider.updateFriendshipStatus(friendshipId, 'REJECTED');
}

/**
 * Get friends list
 */
export async function getFriends(userId: string): Promise<User[]> {
  return friendshipProvider.getFriends(userId);
}

/**
 * Get pending friend requests
 */
export async function getPendingRequests(userId: string) {
  return friendshipProvider.getPendingRequests(userId);
}

/**
 * Get sent friend requests
 */
export async function getSentRequests(userId: string) {
  return friendshipProvider.getSentRequests(userId);
}

/**
 * Search users
 */
export async function searchUsers(query: string, currentUserId: string): Promise<User[]> {
  if (!query || query.length < 2) return [];
  
  const users = await friendshipProvider.searchUsers(query, currentUserId);
  
  // We should ideally check friendship status for each user to indicate in UI
  // But for MVP, returning users is fine. Frontend can check if they are already friends.
  return users;
}
