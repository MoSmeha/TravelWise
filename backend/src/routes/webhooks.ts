

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


router.get('/health', getHealth);


router.get('/upcoming-trips', validate(upcomingTripsQuerySchema, 'query'), getUpcomingTrips);


router.get('/unchecked-items', getUncheckedItems);


router.get('/trips-for-weather-check', getTripsForWeatherCheck);


router.post('/add-weather-checklist', validate(addWeatherChecklistSchema), addWeatherChecklist);


router.post('/send-weather-notification', validate(sendWeatherNotificationSchema), sendWeatherNotification);

export default router;
