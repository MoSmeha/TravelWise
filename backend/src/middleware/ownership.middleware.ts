/**
 * Ownership Middleware
 * Scalable user data isolation - verifies the authenticated user owns or has access to a resource
 */

import { NextFunction, Response } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from './auth.middleware.js';

/**
 * Result of an ownership lookup
 */
interface OwnershipResult {
  ownerId: string | null;
  sharedUserIds?: string[];  // Future: users invited to this resource
}

/**
 * Resource lookup functions
 * Maps resource types to their ownership lookup logic
 */
const resourceLookups: Record<string, (id: string) => Promise<OwnershipResult | null>> = {
  /**
   * Itinerary ownership lookup
   * Also checks ItineraryShare for users with ACCEPTED status
   */
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

  /**
   * ChecklistItem ownership lookup (via parent itinerary)
   */
  checklistItem: async (id: string) => {
    const item = await prisma.checklistItem.findUnique({
      where: { id },
      include: { itinerary: { select: { userId: true } } },
    });
    return item ? { ownerId: item.itinerary.userId } : null;
  },

  /**
   * ItineraryItem ownership lookup (via parent day -> itinerary)
   */
  itineraryItem: async (id: string) => {
    const item = await prisma.itineraryItem.findUnique({
      where: { id },
      include: { day: { include: { itinerary: { select: { userId: true } } } } },
    });
    return item ? { ownerId: item.day.itinerary.userId } : null;
  },

  /**
   * ItineraryEmbedding ownership lookup (via parent itinerary)
   */
  itineraryEmbedding: async (id: string) => {
    const embedding = await prisma.itineraryEmbedding.findUnique({
      where: { id },
      include: { itinerary: { select: { userId: true } } },
    });
    return embedding ? { ownerId: embedding.itinerary.userId } : null;
  },
};

/**
 * Check if a user has access to a resource
 * @param userId - The user ID to check
 * @param result - The ownership lookup result
 */
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

/**
 * Factory function to create ownership verification middleware
 * 
 * @param resourceType - The type of resource ('itinerary', 'checklistItem', etc.)
 * @param paramName - The request parameter containing the resource ID (default: 'id')
 * @returns Express middleware function
 * 
 * @example
 * // Verify user owns the itinerary with ID from :id param
 * router.get('/:id', requireOwnership('itinerary'), controller.get);
 * 
 * // Verify user owns the itinerary with ID from :itineraryId param
 * router.get('/:itineraryId/items', requireOwnership('itinerary', 'itineraryId'), controller.getItems);
 */
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
      
      // User has access, continue to the next middleware/handler
      next();
    } catch (error: any) {
      console.error(`Ownership check error for ${resourceType}:`, error.message);
      res.status(500).json({ error: 'Failed to verify resource ownership' });
    }
  };
}
