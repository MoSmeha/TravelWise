

import { webhookProvider } from './webhook.provider.js';
import { socketService } from '../../services/socket.service.js';
import {
  UpcomingTripRecord,
  UncheckedItemsRecord,
  TripForWeatherCheckRecord,
  CreateWeatherChecklistData,
  CreateWeatherNotificationData,
  NotificationRecord,
  IWebhookProvider,
  RawUpcomingTripRecord,
  RawUncheckedItemsRecord,
  RawTripForWeatherCheckRecord,
} from './webhook.contract.js';




function calculateHoursUntilFlight(flightDate: Date | null): number | null {
  if (!flightDate) return null;
  const now = new Date();
  return Math.round((flightDate.getTime() - now.getTime()) / (1000 * 60 * 60));
}


function transformUpcomingTrip(raw: RawUpcomingTripRecord): UpcomingTripRecord {
  const firstDay = raw.days.find(d => d.dayNumber === 1);
  const firstDayPlaces = firstDay?.items.map(i => i.place.name) || [];

  return {
    id: raw.id,
    country: raw.country,
    flightDate: raw.flightDate,
    hoursUntilFlight: calculateHoursUntilFlight(raw.flightDate),
    numberOfDays: raw.numberOfDays,
    travelStyles: raw.travelStyles,
    uncheckedItemsCount: raw.checklist.length,
    firstDayPlaces,
  };
}


function transformUncheckedItemsTrip(raw: RawUncheckedItemsRecord): UncheckedItemsRecord {
  return {
    id: raw.id,
    country: raw.country,
    flightDate: raw.flightDate,
    hoursUntilFlight: calculateHoursUntilFlight(raw.flightDate),
    uncheckedItems: raw.checklist.map(item => ({
      category: item.category,
      item: item.item,
      reason: item.reason,
    })),
    uncheckedCount: raw.checklist.length,
  };
}


function transformWeatherCheckTrip(raw: RawTripForWeatherCheckRecord): TripForWeatherCheckRecord {

  const allPlaces = raw.days.flatMap(day =>
    day.items.map(item => ({
      name: item.place.name,
      lat: item.place.latitude,
      lon: item.place.longitude,
      category: item.place.category,
      dayNumber: day.dayNumber,
    }))
  );


  const uniquePlaces = Array.from(
    new Map(allPlaces.map(p => [`${p.lat},${p.lon}`, p])).values()
  );

  return {
    itineraryId: raw.id,
    userId: raw.userId,
    userEmail: raw.user?.email || null,
    userName: raw.user?.name || null,
    country: raw.country,
    flightDate: raw.flightDate,
    numberOfDays: raw.numberOfDays,
    travelStyles: raw.travelStyles,
    places: uniquePlaces,
  };
}




export async function getUpcomingTrips(
  hoursAhead: number = 48,
  provider: IWebhookProvider = webhookProvider
): Promise<UpcomingTripRecord[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  const rawTrips = await provider.findUpcomingTrips(now, cutoff);
  return rawTrips.map(transformUpcomingTrip);
}


export async function getUncheckedItems(
  provider: IWebhookProvider = webhookProvider
): Promise<UncheckedItemsRecord[]> {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const rawTrips = await provider.findTripsWithUncheckedItems(now, tomorrow);
  return rawTrips.map(transformUncheckedItemsTrip);
}


export async function getTripsForWeatherCheck(
  provider: IWebhookProvider = webhookProvider
): Promise<TripForWeatherCheckRecord[]> {
  const now = new Date();
  const twoDaysFromNow = new Date(now);
  twoDaysFromNow.setDate(now.getDate() + 2);
  twoDaysFromNow.setHours(0, 0, 0, 0);

  const threeDaysFromNow = new Date(twoDaysFromNow);
  threeDaysFromNow.setDate(twoDaysFromNow.getDate() + 1);

  const rawTrips = await provider.findTripsForWeatherCheck(twoDaysFromNow, threeDaysFromNow);
  return rawTrips.map(transformWeatherCheckTrip);
}


export async function addWeatherChecklist(
  data: CreateWeatherChecklistData,
  provider: IWebhookProvider = webhookProvider
): Promise<{ count: number }> {

  const itemsWithDefaults = {
    ...data,
    items: data.items.map(item => ({
      ...item,
      reason: item.reason || 'Based on weather forecast',
    })),
  };

  return provider.createWeatherChecklist(itemsWithDefaults);
}


export async function sendWeatherNotification(
  data: CreateWeatherNotificationData,
  provider: IWebhookProvider = webhookProvider
): Promise<NotificationRecord> {
  const notification = await provider.createWeatherNotification(data);


  socketService.emitToUser(data.userId, 'notification:new', {
    id: notification.id,
    type: 'TRIP_REMINDER',
    title: data.title,
    message: data.message,
    data: { itineraryId: data.itineraryId, weatherSummary: data.weatherSummary },
    createdAt: notification.createdAt,
  });

  return notification;
}
