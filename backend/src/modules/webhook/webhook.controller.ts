

import { Request, Response } from 'express';
import {
  getUpcomingTrips as fetchUpcomingTrips,
  getUncheckedItems as fetchUncheckedItems,
  getTripsForWeatherCheck as fetchTripsForWeatherCheck,
  addWeatherChecklist as createWeatherChecklist,
  sendWeatherNotification as createWeatherNotification,
} from './webhook.service.js';
import {
  UpcomingTripsQuery,
  AddWeatherChecklistInput,
  SendWeatherNotificationInput,
} from '../../schemas/webhook.schema.js';


export async function getHealth(_req: Request, res: Response) {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'TravelWise Webhooks',
  });
}


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


export async function getUncheckedItems(_req: Request, res: Response) {
  try {
    const trips = await fetchUncheckedItems();
    
    res.json({ data: trips, count: trips.length });
  } catch (error) {
    console.error('Error fetching unchecked items:', error);
    res.status(500).json({ error: 'Failed to fetch unchecked items' });
  }
}


export async function getTripsForWeatherCheck(_req: Request, res: Response) {
  try {
    const trips = await fetchTripsForWeatherCheck();
    
    // Return array directly for n8n compatibility
    res.json(trips);
  } catch (error) {
    console.error('Error fetching trips for weather check:', error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
}


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
