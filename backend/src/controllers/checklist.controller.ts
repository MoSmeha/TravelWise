/**
 * Checklist Controller
 * Handles HTTP concerns for checklist endpoints
 */

import { ChecklistCategory } from '@prisma/client';
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { CreateChecklistItemInput, UpdateChecklistItemInput } from '../schemas/checklist.schema';

/**
 * GET /api/checklist/:itineraryId
 * Get all checklist items for an itinerary
 */
export async function getChecklist(req: Request, res: Response) {
  try {
    const { itineraryId } = req.params;
    
    const items = await prisma.checklistItem.findMany({
      where: { itineraryId },
      orderBy: [
        { category: 'asc' },
        { createdAt: 'asc' },
      ],
    });
    
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
    const { isChecked } = req.body as UpdateChecklistItemInput;
    
    const updated = await prisma.checklistItem.update({
      where: { id: itemId },
      data: { isChecked },
    });
    
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
    const { category, item, reason } = req.body as CreateChecklistItemInput;
    
    const newItem = await prisma.checklistItem.create({
      data: {
        itineraryId,
        category: category as ChecklistCategory,
        item,
        reason: reason || null,
        source: 'user',
      },
    });
    
    return res.json({ data: newItem });
  } catch (error: any) {
    console.error('Create checklist item error:', error);
    return res.status(500).json({ error: 'Failed to create checklist item', message: error.message });
  }
}
