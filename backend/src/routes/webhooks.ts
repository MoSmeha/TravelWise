/**
 * Webhook Routes
 * Routes for n8n automation workflows
 */

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  upcomingTripsQuerySchema,
  addWeatherChecklistSchema,
  sendWeatherNotificationSchema,
} from '../schemas/webhook.schema.js';
import {
  getHealth,
  getUpcomingTrips,
  getUncheckedItems,
  getTripsForWeatherCheck,
  addWeatherChecklist,
  sendWeatherNotification,
} from '../controllers/webhook.controller.js';

const router = Router();

// GET /health - Health check for n8n connectivity
router.get('/health', getHealth);

// GET /upcoming-trips - Itineraries with flights in next N hours
router.get('/upcoming-trips', validate(upcomingTripsQuerySchema, 'query'), getUpcomingTrips);

// GET /unchecked-items - Itineraries with unchecked items, flight <24 hours
router.get('/unchecked-items', getUncheckedItems);

// GET /trips-for-weather-check - Trips with flight in 2 days (for weather workflow)
router.get('/trips-for-weather-check', getTripsForWeatherCheck);

// POST /add-weather-checklist - Bulk add weather-based checklist items
router.post('/add-weather-checklist', validate(addWeatherChecklistSchema), addWeatherChecklist);

// POST /send-weather-notification - Create notification and emit via socket.io
router.post('/send-weather-notification', validate(sendWeatherNotificationSchema), sendWeatherNotification);

export default router;
