

import prisma from '../shared/lib/prisma.js';
import {
  AdminUserListItem,
  CountResult,
  IAdminProvider,
  ItineraryWithBudget,
  ItineraryWithStyles,
  UserGrowthData,
} from './admin.contract.js';

class AdminPgProvider implements IAdminProvider {


  async getTotalUserCount(): Promise<number> {
    return prisma.user.count();
  }

  async getVerifiedUserCount(): Promise<number> {
    return prisma.user.count({ where: { emailVerified: true } });
  }

  async getUserCountSince(date: Date): Promise<number> {
    return prisma.user.count({ where: { createdAt: { gte: date } } });
  }

  async getUsersCreatedSince(date: Date): Promise<UserGrowthData[]> {
    return prisma.user.findMany({
      where: { createdAt: { gte: date } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }



  async getTotalItineraryCount(): Promise<number> {
    return prisma.userItinerary.count();
  }

  async getItinerariesGroupedByCountry(): Promise<CountResult[]> {
    const results = await prisma.userItinerary.groupBy({
      by: ['country'],
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: 10,
    });

    return results.map((r) => ({
      field: r.country,
      count: r._count.country,
    }));
  }

  async getAllItineraryStyles(): Promise<ItineraryWithStyles[]> {
    return prisma.userItinerary.findMany({
      select: { travelStyles: true },
    });
  }

  async getAllItineraryBudgets(): Promise<ItineraryWithBudget[]> {
    return prisma.userItinerary.findMany({
      select: { budgetUSD: true },
    });
  }



  async getTotalPostCount(): Promise<number> {
    return prisma.post.count({ where: { deletedAt: null } });
  }

  async getTotalFriendshipCount(): Promise<number> {
    return prisma.friendship.count({ where: { status: 'ACCEPTED' } });
  }

  async getTotalLikeCount(): Promise<number> {
    return prisma.like.count();
  }

  async getTotalCommentCount(): Promise<number> {
    return prisma.comment.count({ where: { deletedAt: null } });
  }

  async getNotificationsGroupedByType(): Promise<CountResult[]> {
    const results = await prisma.notification.groupBy({
      by: ['type'],
      _count: { type: true },
    });

    return results.map((r) => ({
      field: r.type,
      count: r._count.type,
    }));
  }



  async getPlacesGroupedByCategory(): Promise<CountResult[]> {
    const results = await prisma.place.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
    });

    return results.map((r) => ({
      field: r.category,
      count: r._count.category,
    }));
  }




  async getUsersPaginated(
    skip: number,
    take: number,
    search?: string
  ): Promise<{ users: AdminUserListItem[]; total: number }> {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { username: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              itineraries: true,
              posts: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        username: u.username,
        avatarUrl: u.avatarUrl,
        emailVerified: u.emailVerified,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt,
        itineraryCount: u._count.itineraries,
        postCount: u._count.posts,
      })),
      total,
    };
  }
}

export const adminProvider = new AdminPgProvider();

export { AdminPgProvider };
