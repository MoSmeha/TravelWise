import { Friendship, User } from '@prisma/client';
import { friendshipProvider } from '../providers/friendship.provider.pg';
import { notificationService } from './notification.service';
import { IFriendshipProvider } from '../provider-contract/friendship.provider-contract';

class FriendshipService {
  private provider: IFriendshipProvider;

  constructor(provider: IFriendshipProvider = friendshipProvider) {
    this.provider = provider;
  }

  async sendFriendRequest(requesterId: string, addresseeId: string): Promise<Friendship> {
    // 1. Check if friendship already exists
    const existing = await this.provider.getFriendship(requesterId, addresseeId);
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
         return this.provider.updateFriendshipStatus(existing.id, 'PENDING');
      }
    }

    // 2. Create friendship record
    const friendship = await this.provider.createFriendship(requesterId, addresseeId);

    // 3. Send notification
    // We need requester details for the notification message
    // Assuming friendship.requester is populated by the provider
    const requesterName = (friendship as any).requester?.name || 'Someone';
    
    await notificationService.createNotification(
      addresseeId,
      'FRIEND_REQUEST',
      'New Friend Request',
      `${requesterName} sent you a friend request`,
      { friendshipId: friendship.id, requesterId }
    );

    return friendship;
  }

  async acceptFriendRequest(userId: string, friendshipId: string): Promise<Friendship> {
    const friendship = await this.provider.getFriendshipById(friendshipId);
    
    if (!friendship) {
      throw new Error('Friendship not found');
    }

    if (friendship.addresseeId !== userId) {
      throw new Error('Unauthorized to accept this request');
    }

    if (friendship.status !== 'PENDING') {
      throw new Error('Friend request is not pending');
    }

    const updatedFriendship = await this.provider.updateFriendshipStatus(friendshipId, 'ACCEPTED');

    // Notify the requester
    const accepterName = (updatedFriendship as any).addressee?.name || 'Someone';
    await notificationService.createNotification(
      friendship.requesterId,
      'FRIEND_ACCEPTED',
      'Friend Request Accepted',
      `${accepterName} accepted your friend request`,
      { friendshipId: updatedFriendship.id, accepterId: userId }
    );

    return updatedFriendship;
  }

  async rejectFriendRequest(userId: string, friendshipId: string): Promise<Friendship> {
    const friendship = await this.provider.getFriendshipById(friendshipId);
    
    if (!friendship) {
      throw new Error('Friendship not found');
    }

    if (friendship.addresseeId !== userId) {
      throw new Error('Unauthorized to reject this request');
    }

    // We can either set status to REJECTED or delete the record.
    return this.provider.updateFriendshipStatus(friendshipId, 'REJECTED');
  }

  async getFriends(userId: string): Promise<User[]> {
    return this.provider.getFriends(userId);
  }

  async getPendingRequests(userId: string) {
    return this.provider.getPendingRequests(userId);
  }

  async getSentRequests(userId: string) {
    return this.provider.getSentRequests(userId);
  }

  async searchUsers(query: string, currentUserId: string): Promise<User[]> {
    if (!query || query.length < 2) return [];
    
    const users = await this.provider.searchUsers(query, currentUserId);
    
    // We should ideally check friendship status for each user to indicate in UI
    // But for MVP, returning users is fine. Frontend can check if they are already friends.
    return users;
  }
}

export const friendshipService = new FriendshipService();
