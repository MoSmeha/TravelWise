/**
 * RAG Routes
 * Pure routing - all logic delegated to controllers
 */

import { Router } from 'express';
import * as ragController from '../controllers/rag.controller';
import { validate } from '../middleware/validate';
import { askQuestionSchema } from '../schemas/itinerary.schema';

const router = Router();

// POST /api/itinerary/:id/ask - Ask a question about an itinerary
router.post('/:id/ask', validate(askQuestionSchema), ragController.askQuestion);

// GET /api/itinerary/:id/embeddings/status - Check embedding status
router.get('/:id/embeddings/status', ragController.getEmbeddingStatus);

export default router;
