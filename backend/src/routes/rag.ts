import { Router } from 'express';
import { askQuestion, getEmbeddingStatus } from '../modules/ai/rag.controller.js';
import { requireOwnership } from '../middleware/ownership.middleware.js';
import { validate } from '../middleware/validate.js';
import { askQuestionSchema } from '../schemas/itinerary.schema.js';

const router = Router();


router.post('/:id/ask', requireOwnership('itinerary'), validate(askQuestionSchema), askQuestion);


router.get('/:id/embeddings/status', requireOwnership('itinerary'), getEmbeddingStatus);

export default router;
