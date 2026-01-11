/**
 * Checklist Routes
 * Pure routing - all logic delegated to controllers
 */

import { Router } from 'express';
import * as checklistController from '../controllers/checklist.controller';
import { requireOwnership } from '../middleware/ownership.middleware';
import { validate } from '../middleware/validate';
import { 
  createChecklistItemSchema, 
  updateChecklistItemSchema 
} from '../schemas/checklist.schema';

const router = Router();

// GET /api/checklist/:itineraryId - Get all checklist items (requires itinerary ownership)
router.get('/:itineraryId', requireOwnership('itinerary', 'itineraryId'), checklistController.getChecklist);

// PATCH /api/checklist/:itemId - Toggle checklist item (requires checklistItem ownership)
router.patch('/:itemId', requireOwnership('checklistItem', 'itemId'), validate(updateChecklistItemSchema), checklistController.updateItem);

// POST /api/checklist/:itineraryId - Add custom item (requires itinerary ownership)
router.post('/:itineraryId', requireOwnership('itinerary', 'itineraryId'), validate(createChecklistItemSchema), checklistController.createItem);

export default router;
