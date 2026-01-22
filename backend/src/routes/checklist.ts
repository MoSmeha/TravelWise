import { Router } from 'express';
import { getChecklist, updateItem, createItem } from '../controllers/checklist.controller.js';
import { requireOwnership } from '../middleware/ownership.middleware.js';
import { validate } from '../middleware/validate.js';
import { 
  createChecklistItemSchema, 
  updateChecklistItemSchema 
} from '../schemas/checklist.schema.js';

const router = Router();

// GET /api/checklist/:itineraryId - Get all checklist items (requires itinerary ownership)
router.get('/:itineraryId', requireOwnership('itinerary', 'itineraryId'), getChecklist);

// PATCH /api/checklist/:itemId - Toggle checklist ite  m (requires checklistItem ownership)
router.patch('/:itemId', requireOwnership('checklistItem', 'itemId'), validate(updateChecklistItemSchema), updateItem);

// POST /api/checklist/:itineraryId - Add custom item (requires itinerary ownership)
router.post('/:itineraryId', requireOwnership('itinerary', 'itineraryId'), validate(createChecklistItemSchema), createItem);

export default router;
