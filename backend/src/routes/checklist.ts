/**
 * Checklist Routes
 * Pure routing - all logic delegated to controllers
 */

import { Router } from 'express';
import * as checklistController from '../controllers/checklist.controller';
import { validate } from '../middleware/validate';
import { 
  createChecklistItemSchema, 
  updateChecklistItemSchema 
} from '../schemas/checklist.schema';

const router = Router();

// GET /api/checklist/:itineraryId - Get all checklist items
router.get('/:itineraryId', checklistController.getChecklist);

// PATCH /api/checklist/:itemId - Toggle checklist item
router.patch('/:itemId', validate(updateChecklistItemSchema), checklistController.updateItem);

// POST /api/checklist/:itineraryId - Add custom item
router.post('/:itineraryId', validate(createChecklistItemSchema), checklistController.createItem);

export default router;
