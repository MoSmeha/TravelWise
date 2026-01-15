/**
 * Checklist Controller
 * Handles HTTP concerns for checklist endpoints
 * Business logic is delegated to checklistService
 */

import { Request, Response } from 'express';
import { CreateChecklistItemInput, UpdateChecklistItemInput } from '../schemas/checklist.schema';
import { checklistService } from '../services/checklist.service';

// ============================================================================
// Checklist CRUD Operations
// ============================================================================

/**
 * GET /api/checklist/:itineraryId
 * Get all checklist items for an itinerary
 */
export async function getChecklist(req: Request, res: Response) {
  try {
    const { itineraryId } = req.params;

    const items = await checklistService.getItineraryChecklist(itineraryId);

    return res.json({ data: items });
  } catch (error: any) {
    console.error('Get checklist error:', error);
    return res.status(500).json({ error: 'Failed to get checklist', message: error.message });
  }
}

/**
 * PATCH /api/checklist/:itemId
 * Toggle checklist item checked status
 */
export async function updateItem(req: Request, res: Response) {
  try {
    const { itemId } = req.params;
    const input = req.body as UpdateChecklistItemInput;

    const updated = await checklistService.updateItem(itemId, input);

    return res.json({ data: updated });
  } catch (error: any) {
    console.error('Update checklist item error:', error);
    return res.status(500).json({ error: 'Failed to update checklist item', message: error.message });
  }
}

/**
 * POST /api/checklist/:itineraryId
 * Add custom checklist item
 */
export async function createItem(req: Request, res: Response) {
  try {
    const { itineraryId } = req.params;
    const input = req.body as CreateChecklistItemInput;

    const newItem = await checklistService.createItem(itineraryId, input);

    return res.json({ data: newItem });
  } catch (error: any) {
    console.error('Create checklist item error:', error);
    return res.status(500).json({ error: 'Failed to create checklist item', message: error.message });
  }
}
