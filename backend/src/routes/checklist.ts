import { Router } from 'express';
import { getChecklist, updateItem, createItem, deleteItem, deleteAllItems } from '../modules/checklist/checklist.controller.js';
import { requireOwnership } from '../middleware/ownership.middleware.js';
import { validate } from '../middleware/validate.js';
import { 
  createChecklistItemSchema, 
  updateChecklistItemSchema 
} from '../modules/checklist/checklist.schema.js';

const router = Router();


router.get('/:itineraryId', requireOwnership('itinerary', 'itineraryId'), getChecklist);


router.patch('/:itemId', requireOwnership('checklistItem', 'itemId'), validate(updateChecklistItemSchema), updateItem);


router.post('/:itineraryId', requireOwnership('itinerary', 'itineraryId'), validate(createChecklistItemSchema), createItem);


router.delete('/all/:itineraryId', requireOwnership('itinerary', 'itineraryId'), deleteAllItems);


router.delete('/:itemId', requireOwnership('checklistItem', 'itemId'), deleteItem);

export default router;
