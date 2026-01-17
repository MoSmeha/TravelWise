import { Router } from 'express';
import * as ragController from '../controllers/rag.controller';
import { requireOwnership } from '../middleware/ownership.middleware';
import { validate } from '../middleware/validate';
import { askQuestionSchema } from '../schemas/itinerary.schema';

const router = Router();

// POST /api/itinerary/:id/ask - Ask a question about an itinerary (requires ownership)
router.post('/:id/ask', requireOwnership('itinerary'), validate(askQuestionSchema), ragController.askQuestion);

// GET /api/itinerary/:id/embeddings/status - Check embedding status (requires ownership)
router.get('/:id/embeddings/status', requireOwnership('itinerary'), ragController.getEmbeddingStatus);

export default router;
