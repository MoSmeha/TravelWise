import { User, Friendship, FriendshipStatus } from '../generated/prisma/client.js';

export interface FriendRequestWithUser extends Friendship {
  requester?: User;
  addressee?: User;
}

export interface IFriendshipProvider {
  createFriendship(requesterId: string, addresseeId: string): Promise<Friendship>;
  updateFriendshipStatus(id: string, status: FriendshipStatus): Promise<Friendship>;
  getFriendship(requesterId: string, addresseeId: string): Promise<Friendship | null>;
  getFriendshipById(id: string): Promise<Friendship | null>;
  getPendingRequests(userId: string): Promise<FriendRequestWithUser[]>;
  getSentRequests(userId: string): Promise<FriendRequestWithUser[]>;
  getFriends(userId: string): Promise<User[]>;
  deleteFriendship(id: string): Promise<void>;
  searchUsers(query: string, excludeUserId: string): Promise<User[]>;
}
