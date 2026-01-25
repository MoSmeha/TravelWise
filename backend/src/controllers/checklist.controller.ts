import { Request, Response } from 'express';
import { CreateChecklistItemInput, UpdateChecklistItemInput } from '../schemas/checklist.schema.js';
import {
  getItineraryChecklist,
  updateItem as updateChecklistItem,
  createItem as createChecklistItem,
  deleteItem as deleteChecklistItem,
  deleteAllItems as deleteAllChecklistItems
} from '../services/checklist.service.js';

//GET /api/checklist/:itineraryId
//Get all checklist items for an itinerary
export async function getChecklist(req: Request, res: Response) {
  try {
    const { itineraryId } = req.params;

    const items = await getItineraryChecklist(itineraryId);

    return res.json({ data: items });
  } catch (error: any) {
    console.error('Get checklist error:', error);
    return res.status(500).json({ error: 'Failed to get checklist', message: error.message });
  }
}

//PATCH /api/checklist/:itemId
//Toggle checklist item checked status
export async function updateItem(req: Request, res: Response) {
  try {
    const { itemId } = req.params;
    const input = req.body as UpdateChecklistItemInput;

    const updated = await updateChecklistItem(itemId, input);

    return res.json({ data: updated });
  } catch (error: any) {
    console.error('Update checklist item error:', error);
    return res.status(500).json({ error: 'Failed to update checklist item', message: error.message });
  }
}

//POST /api/checklist/:itineraryId
//Add custom checklist item
export async function createItem(req: Request, res: Response) {
  try {
    const { itineraryId } = req.params;
    const input = req.body as CreateChecklistItemInput;

    const newItem = await createChecklistItem(itineraryId, input);

    return res.json({ data: newItem });
  } catch (error: any) {
    console.error('Create checklist item error:', error);
    return res.status(500).json({ error: 'Failed to create checklist item', message: error.message });
  }
}

//DELETE /api/checklist/:itemId
//Delete a single checklist item
export async function deleteItem(req: Request, res: Response) {
  try {
    const { itemId } = req.params;

    await deleteChecklistItem(itemId);

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Delete checklist item error:', error);
    return res.status(500).json({ error: 'Failed to delete checklist item', message: error.message });
  }
}

//DELETE /api/checklist/all/:itineraryId
//Delete all checklist items for an itinerary
export async function deleteAllItems(req: Request, res: Response) {
  try {
    const { itineraryId } = req.params;

    const result = await deleteAllChecklistItems(itineraryId);

    return res.json({ success: true, deleted: result.count });
  } catch (error: any) {
    console.error('Delete all checklist items error:', error);
    return res.status(500).json({ error: 'Failed to delete checklist items', message: error.message });
  }
}
