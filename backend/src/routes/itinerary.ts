/**
 * Itinerary Routes
 * Pure routing - all logic delegated to controllers
 */

import { Router } from 'express';
import * as itineraryController from '../controllers/itinerary.controller';
import { validate } from '../middleware/validate';
import { generateItinerarySchema } from '../schemas/itinerary.schema';

const router = Router();

// GET /api/itinerary/countries - List supported countries
router.get('/countries', itineraryController.getCountries);

// POST /api/itinerary/generate - Generate a new itinerary
router.post('/generate', validate(generateItinerarySchema), itineraryController.generate);

export default router;
