import { User, Friendship, FriendshipStatus } from '../../generated/prisma/client.js';
import prisma from '../shared/lib/prisma.js';
import { IFriendshipProvider, FriendRequestWithUser } from './friendship.contract.js';

export class PostgresFriendshipProvider implements IFriendshipProvider {
  async createFriendship(requesterId: string, addresseeId: string): Promise<Friendship> {
    return prisma.friendship.create({
      data: {
        requesterId,
        addresseeId,
        status: 'PENDING',
      },
      include: {
        requester: true,
        addressee: true,
      },
    });
  }

  async updateFriendshipStatus(id: string, status: FriendshipStatus): Promise<Friendship> {
    return prisma.friendship.update({
      where: { id },
      data: { status },
      include: {
        requester: true,
        addressee: true,
      },
    });
  }

  async getFriendship(requesterId: string, addresseeId: string): Promise<Friendship | null> {
    return prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });
  }

  async getFriendshipById(id: string): Promise<Friendship | null> {
    return prisma.friendship.findUnique({
      where: { id },
      include: {
        requester: true,
        addressee: true,
      },
    });
  }

  async getPendingRequests(userId: string): Promise<FriendRequestWithUser[]> {
    return prisma.friendship.findMany({
      where: {
        addresseeId: userId,
        status: 'PENDING',
      },
      include: {
        requester: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSentRequests(userId: string): Promise<FriendRequestWithUser[]> {
    return prisma.friendship.findMany({
      where: {
        requesterId: userId,
        status: 'PENDING',
      },
      include: {
        addressee: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFriends(userId: string): Promise<User[]> {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterId: userId },
          { addresseeId: userId },
        ],
      },
      include: {
        requester: true,
        addressee: true,
      },
    });

    return friendships.map(f => {
      // Return the other person (if I'm requester, return addressee, and vice versa)
      return f.requesterId === userId ? f.addressee : f.requester;
    });
  }

  async deleteFriendship(id: string): Promise<void> {
    await prisma.friendship.delete({
      where: { id },
    });
  }

  async searchUsers(query: string, excludeUserId: string): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        AND: [
          { id: { not: excludeUserId } },
          {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      take: 20,
    });
  }
}

export const friendshipProvider = new PostgresFriendshipProvider();
