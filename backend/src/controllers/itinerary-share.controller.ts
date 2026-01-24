import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  CreateShareSchema,
  UpdateSharePermissionSchema,
} from '../schemas/itinerary-share.schema.js';
import {
  inviteUser,
  acceptInvitation,
  rejectInvitation,
  removeCollaborator,
  updatePermission,
  getCollaborators,
  getUserSharedItineraries,
  checkPermission,
} from '../services/itinerary-share.service.js';
import { ShareStatus } from '../generated/prisma/client.js';

// POST /api/itinerary/:id/share
// Invite a user to collaborate on an itinerary
export async function inviteUserToItinerary(req: Request, res: Response) {
  try {
    const { id: itineraryId } = req.params;
    const userId = (req as AuthenticatedRequest).user!.userId;
    
    const input = CreateShareSchema.parse(req.body);

    // Check if requesting user is owner
    const permission = await checkPermission(itineraryId, userId);
    if (permission !== 'OWNER') {
      return res.status(403).json({ error: 'Only the owner can invite collaborators' });
    }

    const share = await inviteUser(
      itineraryId,
      input.userId,
      userId,
      input.permission
    );

    return res.status(201).json(share);
  } catch (error: any) {
    console.error('Invite user error:', error);
    
    if (error.message?.includes('Unique constraint')) {
      return res.status(409).json({ error: 'User already invited to this itinerary' });
    }
    
    return res.status(500).json({
      error: 'Failed to invite user',
      message: error.message,
    });
  }
}

// GET /api/itinerary/:id/shares
// Get all collaborators for an itinerary
export async function listCollaborators(req: Request, res: Response) {
  try {
    const { id: itineraryId } = req.params;
    const userId = (req as AuthenticatedRequest).user!.userId;

    const collaborators = await getCollaborators(itineraryId, userId);

    return res.json(collaborators);
  } catch (error: any) {
    console.error('List collaborators error:', error);
    
    if (error.message === 'No access to this itinerary') {
      return res.status(403).json({ error: error.message });
    }
    
    return res.status(500).json({
      error: 'Failed to list collaborators',
      message: error.message,
    });
  }
}

// PUT /api/itinerary/share/:shareId/accept
// Accept an itinerary invitation
export async function acceptItineraryInvitation(req: Request, res: Response) {
  try {
    const { shareId } = req.params;
    const userId = (req as AuthenticatedRequest).user!.userId;

    const share = await acceptInvitation(shareId, userId);

    return res.json(share);
  } catch (error: any) {
    console.error('Accept invitation error:', error);
    
    if (error.message.includes('Unauthorized') || error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('not pending')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({
      error: 'Failed to accept invitation',
      message: error.message,
    });
  }
}

// PUT /api/itinerary/share/:shareId/reject
// Reject an itinerary invitation
export async function rejectItineraryInvitation(req: Request, res: Response) {
  try {
    const { shareId } = req.params;
    const userId = (req as AuthenticatedRequest).user!.userId;

    const share = await rejectInvitation(shareId, userId);

    return res.json(share);
  } catch (error: any) {
    console.error('Reject invitation error:', error);
    
    if (error.message.includes('Unauthorized') || error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    if (error.message.includes('not pending')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({
      error: 'Failed to reject invitation',
      message: error.message,
    });
  }
}

// DELETE /api/itinerary/share/:shareId
// Remove a collaborator from an itinerary
export async function removeItineraryCollaborator(req: Request, res: Response) {
  try {
    const { shareId } = req.params;
    const userId = (req as AuthenticatedRequest).user!.userId;

    await removeCollaborator(shareId, userId);

    return res.status(204).send();
  } catch (error: any) {
    console.error('Remove collaborator error:', error);
    
    if (error.message.includes('Only the owner') || error.message.includes('Cannot remove yourself')) {
      return res.status(403).json({ error: error.message });
    }
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    return res.status(500).json({
      error: 'Failed to remove collaborator',
      message: error.message,
    });
  }
}

// PUT /api/itinerary/share/:shareId/permission
// Update collaborator permission
export async function updateCollaboratorPermission(req: Request, res: Response) {
  try {
    const { shareId } = req.params;
    const userId = (req as AuthenticatedRequest).user!.userId;
    
    const input = UpdateSharePermissionSchema.parse(req.body);

    const share = await updatePermission(shareId, input.permission, userId);

    return res.json(share);
  } catch (error: any) {
    console.error('Update permission error:', error);
    
    if (error.message.includes('Only the owner')) {
      return res.status(403).json({ error: error.message });
    }
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    
    return res.status(500).json({
      error: 'Failed to update permission',
      message: error.message,
    });
  }
}

// GET /api/itinerary/shared
// Get all itineraries shared with the user
export async function listSharedItineraries(req: Request, res: Response) {
  try {
    const userId = (req as AuthenticatedRequest).user!.userId;
    const statusParam = req.query.status as string | undefined;
    
    const status = statusParam ? (statusParam as ShareStatus) : undefined;

    const shares = await getUserSharedItineraries(userId, status);

    return res.json(shares);
  } catch (error: any) {
    console.error('List shared itineraries error:', error);
    
    return res.status(500).json({
      error: 'Failed to list shared itineraries',
      message: error.message,
    });
  }
}
