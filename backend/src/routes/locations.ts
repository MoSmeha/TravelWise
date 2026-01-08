import { Request, Response, Router } from 'express';

const router = Router();

// NOTE: Location endpoints are deprecated in favor of AI-generated itineraries
// These endpoints are kept for backwards compatibility but return informational messages

// GET /api/locations - Deprecated
router.get('/', (_req: Request, res: Response) => {
  return res.json({
    message: 'Locations are now generated dynamically by AI. Use POST /api/itinerary/generate instead.',
    deprecatedEndpoint: true,
  });
});

// POST /api/locations/analyze - Deprecated
router.post('/analyze', (_req: Request, res: Response) => {
  return res.json({
    message: 'Location analysis is now integrated into itinerary generation. Use POST /api/itinerary/generate instead.',
    deprecatedEndpoint: true,
  });
});

// GET /api/locations/:id - Deprecated
router.get('/:id', (_req: Request, res: Response) => {
  return res.json({
    message: 'Individual locations are now part of AI-generated itineraries. Use POST /api/itinerary/generate instead.',
    deprecatedEndpoint: true,
  });
});

export default router;
