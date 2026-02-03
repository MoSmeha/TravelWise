

import { NextFunction, Response } from 'express';
import prisma from '../modules/shared/lib/prisma.js';
import { AuthenticatedRequest } from './auth.middleware.js';


interface OwnershipResult {
  ownerId: string | null;
  sharedUserIds?: string[];  // Future: users invited to this resource
}

const resourceLookups: Record<string, (id: string) => Promise<OwnershipResult | null>> = {

  itinerary: async (id: string) => {
    const itinerary = await prisma.userItinerary.findUnique({
      where: { id },
      select: {
        userId: true,
        shares: {
          where: { status: 'ACCEPTED' },
          select: { userId: true }
        }
      },
    });
    return itinerary
      ? {
          ownerId: itinerary.userId,
          sharedUserIds: itinerary.shares?.map(s => s.userId) || []
        }
      : null;
  },


  checklistItem: async (id: string) => {
    const item = await prisma.checklistItem.findUnique({
      where: { id },
      include: { itinerary: { select: { userId: true } } },
    });
    return item ? { ownerId: item.itinerary.userId } : null;
  },


  itineraryItem: async (id: string) => {
    const item = await prisma.itineraryItem.findUnique({
      where: { id },
      include: { day: { include: { itinerary: { select: { userId: true } } } } },
    });
    return item ? { ownerId: item.day.itinerary.userId } : null;
  },


  itineraryEmbedding: async (id: string) => {
    const embedding = await prisma.itineraryEmbedding.findUnique({
      where: { id },
      include: { itinerary: { select: { userId: true } } },
    });
    return embedding ? { ownerId: embedding.itinerary.userId } : null;
  },
};

function hasAccess(userId: string, result: OwnershipResult): boolean {
  // Owner always has access
  if (result.ownerId === userId) {
    return true;
  }
  
  // Check shared access (future feature)
  if (result.sharedUserIds?.includes(userId)) {
    return true;
  }
  
  return false;
}


export function requireOwnership(resourceType: string, paramName: string = 'id') {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      
      const resourceId = req.params[paramName];
      
      if (!resourceId) {
        res.status(400).json({ error: `Missing required parameter: ${paramName}` });
        return;
      }
      
      const lookupFn = resourceLookups[resourceType];
      
      if (!lookupFn) {
        console.error(`Unknown resource type: ${resourceType}`);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
      
      const ownership = await lookupFn(resourceId);
      
      if (!ownership) {
        res.status(404).json({ error: `${resourceType} not found` });
        return;
      }
      
      if (!hasAccess(userId, ownership)) {
        res.status(403).json({ error: 'You do not have permission to access this resource' });
        return;
      }
      
      
      next();
    } catch (error: any) {
      console.error(`Ownership check error for ${resourceType}:`, error.message);
      res.status(500).json({ error: 'Failed to verify resource ownership' });
    }
  };
}
