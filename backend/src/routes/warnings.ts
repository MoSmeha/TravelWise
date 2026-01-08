import { Request, Response, Router } from 'express';

const router = Router();

// NOTE: Warnings are now generated dynamically by AI as part of itineraries
// This endpoint is kept for backwards compatibility

// GET /api/warnings - Deprecated
router.get('/', (_req: Request, res: Response) => {
  return res.json({
    message: 'Warnings are now generated dynamically by AI as part of itinerary generation. Use POST /api/itinerary/generate instead.',
    deprecatedEndpoint: true,
    info: 'The AI-generated itinerary includes country-specific warnings, scam alerts, and safety recommendations.',
  });
});

export default router;
