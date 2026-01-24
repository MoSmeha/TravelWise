/**
 * Webhook Controller
 * Handles n8n automation webhook endpoints
 */

import { Request, Response } from 'express';
import {
  getUpcomingTrips as fetchUpcomingTrips,
  getUncheckedItems as fetchUncheckedItems,
  getTripsForWeatherCheck as fetchTripsForWeatherCheck,
  addWeatherChecklist as createWeatherChecklist,
  sendWeatherNotification as createWeatherNotification,
} from '../services/webhook.service.js';
import {
  UpcomingTripsQuery,
  AddWeatherChecklistInput,
  SendWeatherNotificationInput,
} from '../schemas/webhook.schema.js';

/**
 * GET /api/webhooks/health
 * Health check for n8n to verify connectivity
 */
export async function getHealth(_req: Request, res: Response) {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'TravelWise Webhooks',
  });
}

/**
 * GET /api/webhooks/upcoming-trips
 * Returns itineraries with flights in the next N hours (default 48)
 */
export async function getUpcomingTrips(req: Request, res: Response) {
  try {
    // Query is validated by middleware
    const { hoursAhead } = req.query as unknown as UpcomingTripsQuery;
    
    const trips = await fetchUpcomingTrips(hoursAhead);
    
    res.json({ data: trips, count: trips.length });
  } catch (error) {
    console.error('Error fetching upcoming trips:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming trips' });
  }
}

/**
 * GET /api/webhooks/unchecked-items
 * Returns itineraries with unchecked checklist items, flight in <24 hours
 */
export async function getUncheckedItems(_req: Request, res: Response) {
  try {
    const trips = await fetchUncheckedItems();
    
    res.json({ data: trips, count: trips.length });
  } catch (error) {
    console.error('Error fetching unchecked items:', error);
    res.status(500).json({ error: 'Failed to fetch unchecked items' });
  }
}

/**
 * GET /api/webhooks/trips-for-weather-check
 * Returns trips with flight in exactly 2 days, with place coordinates
 */
export async function getTripsForWeatherCheck(_req: Request, res: Response) {
  try {
    const trips = await fetchTripsForWeatherCheck();
    
    res.json({ data: trips, count: trips.length });
  } catch (error) {
    console.error('Error fetching trips for weather check:', error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
}

/**
 * POST /api/webhooks/add-weather-checklist
 * Bulk add checklist items from n8n weather analysis
 */
export async function addWeatherChecklist(req: Request, res: Response) {
  try {
    // Body is validated by middleware
    const input = req.body as AddWeatherChecklistInput;
    
    const result = await createWeatherChecklist({
      itineraryId: input.itineraryId,
      items: input.items,
    });
    
    res.json({ success: true, created: result.count });
  } catch (error) {
    console.error('Error adding weather checklist:', error);
    res.status(500).json({ error: 'Failed to add checklist items' });
  }
}

/**
 * POST /api/webhooks/send-weather-notification
 * Create in-app notification and emit via socket.io
 */
export async function sendWeatherNotification(req: Request, res: Response) {
  try {
    // Body is validated by middleware
    const input = req.body as SendWeatherNotificationInput;
    
    const notification = await createWeatherNotification({
      userId: input.userId,
      itineraryId: input.itineraryId,
      title: input.title,
      message: input.message,
      weatherSummary: input.weatherSummary,
    });
    
    res.json({ success: true, notificationId: notification.id });
  } catch (error) {
    console.error('Error sending weather notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
}
