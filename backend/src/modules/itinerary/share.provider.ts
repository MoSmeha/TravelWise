import { PrismaClient, SharePermission, ShareStatus } from '../../generated/prisma/client.js';
import {
  IItineraryShareProvider,
  CreateShareParams,
  UpdateShareStatusParams,
  UpdateSharePermissionParams,
} from './share.contract.js';
import prisma from '../shared/lib/prisma.js';

class ItineraryShareProviderPg implements IItineraryShareProvider {
  constructor(private db: PrismaClient = prisma) {}

  async createShare(params: CreateShareParams) {
    return this.db.itineraryShare.create({
      data: {
        itineraryId: params.itineraryId,
        userId: params.userId,
        invitedBy: params.invitedBy,
        permission: params.permission,
        status: ShareStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        itinerary: {
          select: {
            id: true,
            country: true,
            numberOfDays: true,
          },
        },
      },
    });
  }

  async getShareById(shareId: string) {
    return this.db.itineraryShare.findUnique({
      where: { id: shareId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        itinerary: {
          select: {
            id: true,
            country: true,
            numberOfDays: true,
            userId: true,
          },
        },
      },
    });
  }

  async getItineraryShares(itineraryId: string) {
    return this.db.itineraryShare.findMany({
      where: { itineraryId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getUserShares(userId: string, status?: ShareStatus) {
    return this.db.itineraryShare.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: {
        inviter: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        itinerary: {
          select: {
            id: true,
            country: true,
            numberOfDays: true,
            budgetUSD: true,
            travelStyles: true,
            createdAt: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async updateShareStatus(params: UpdateShareStatusParams) {
    return this.db.itineraryShare.update({
      where: { id: params.shareId },
      data: { status: params.status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
        itinerary: {
          select: {
            id: true,
            country: true,
            numberOfDays: true,
          },
        },
      },
    });
  }

  async updateSharePermission(params: UpdateSharePermissionParams) {
    return this.db.itineraryShare.update({
      where: { id: params.shareId },
      data: { permission: params.permission },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async deleteShare(shareId: string) {
    await this.db.itineraryShare.delete({
      where: { id: shareId },
    });
  }

  async getUserPermission(itineraryId: string, userId: string): Promise<SharePermission | null> {

    const itinerary = await this.db.userItinerary.findUnique({
      where: { id: itineraryId },
      select: { userId: true },
    });

    if (itinerary?.userId === userId) {
      return SharePermission.OWNER;
    }


    const share = await this.db.itineraryShare.findFirst({
      where: {
        itineraryId,
        userId,
        status: ShareStatus.ACCEPTED,
      },
      select: { permission: true },
    });

    return share?.permission || null;
  }

  async isOwner(itineraryId: string, userId: string): Promise<boolean> {
    const permission = await this.getUserPermission(itineraryId, userId);
    return permission === SharePermission.OWNER;
  }
}

export const itineraryShareProvider = new ItineraryShareProviderPg();
