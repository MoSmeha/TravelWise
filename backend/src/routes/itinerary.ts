import { Router } from 'express';
import * as itineraryController from '../controllers/itinerary.controller';
import { requireOwnership } from '../middleware/ownership.middleware';
import { validate } from '../middleware/validate';
import { generateItinerarySchema } from '../schemas/itinerary.schema';

const router = Router();

// GET /countries - List supported countries
router.get('/countries', itineraryController.getCountries);

// POST /generate - Generate a new itinerary (requires authentication - applied at router level in index.ts)
router.post('/generate', validate(generateItinerarySchema), itineraryController.generate);

// GET /user - List user's itineraries
router.get('/user', itineraryController.listUserItineraries);

// GET /:id - Get full itinerary details (requires ownership)
router.get('/:id', requireOwnership('itinerary'), itineraryController.getItineraryDetails);

export default router;
