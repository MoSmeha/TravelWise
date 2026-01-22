import { Router } from 'express';
import {
  getCountries,
  generate,
  listUserItineraries,
  getItineraryDetails,
} from '../controllers/itinerary.controller.js';
import { requireOwnership } from '../middleware/ownership.middleware.js';
import { validate } from '../middleware/validate.js';
import { generateItinerarySchema } from '../schemas/itinerary.schema.js';

const router = Router();

// GET /countries - List supported countries
router.get('/countries', getCountries);

// POST /generate - Generate a new itinerary (requires authentication - applied at router level in index.ts)
router.post('/generate', validate(generateItinerarySchema), generate);

// GET /user - List user's itineraries
router.get('/user', listUserItineraries);

// GET /:id - Get full itinerary details (requires ownership)
router.get('/:id', requireOwnership('itinerary'), getItineraryDetails);

export default router;
