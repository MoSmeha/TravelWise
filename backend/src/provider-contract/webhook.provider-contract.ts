/**
 * Webhook Provider Contract
 * Interfaces and types for webhook data access layer
 */

import { LocationCategory, NotificationType, ChecklistCategory } from '../generated/prisma/client.js';

// ============= Raw Database Record Types (from Prisma) =============

/**
 * Raw trip record from database (before transformation)
 */
export interface RawUpcomingTripRecord {
  id: string;
  country: string;
  flightDate: Date | null;
  numberOfDays: number;
  travelStyles: string[];
  days: Array<{
    dayNumber: number;
    items: Array<{
      place: {
        name: string;
      };
    }>;
  }>;
  checklist: Array<{
    id: string;
    isChecked: boolean;
  }>;
}

/**
 * Raw trip with unchecked items from database
 */
export interface RawUncheckedItemsRecord {
  id: string;
  country: string;
  flightDate: Date | null;
  checklist: Array<{
    category: ChecklistCategory;
    item: string;
    reason: string | null;
  }>;
}

/**
 * Raw trip for weather check from database
 */
export interface RawTripForWeatherCheckRecord {
  id: string;
  userId: string | null;
  country: string;
  flightDate: Date | null;
  numberOfDays: number;
  travelStyles: string[];
  user: {
    id: string;
    email: string;
    name: string;
  } | null;
  days: Array<{
    dayNumber: number;
    items: Array<{
      place: {
        id: string;
        name: string;
        latitude: number;
        longitude: number;
        category: LocationCategory;
      };
    }>;
    hotel: {
      name: string;
      latitude: number;
      longitude: number;
    } | null;
  }>;
}

// ============= Transformed/Output Types (for service layer) =============

export interface UpcomingTripRecord {
  id: string;
  country: string;
  flightDate: Date | null;
  hoursUntilFlight: number | null;
  numberOfDays: number;
  travelStyles: string[];
  uncheckedItemsCount: number;
  firstDayPlaces: string[];
}

export interface UncheckedItemsRecord {
  id: string;
  country: string;
  flightDate: Date | null;
  hoursUntilFlight: number | null;
  uncheckedItems: Array<{
    category: string;
    item: string;
    reason: string | null;
  }>;
  uncheckedCount: number;
}

export interface TripForWeatherCheckRecord {
  itineraryId: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  country: string;
  flightDate: Date | null;
  numberOfDays: number;
  travelStyles: string[];
  places: Array<{
    name: string;
    lat: number;
    lon: number;
    category: LocationCategory;
    dayNumber: number;
  }>;
}

// ============= Input Types =============

export interface WeatherChecklistItem {
  category?: string;
  item: string;
  reason?: string;
}

export interface CreateWeatherChecklistData {
  itineraryId: string;
  items: WeatherChecklistItem[];
}

export interface CreateWeatherNotificationData {
  userId: string;
  itineraryId?: string;
  title: string;
  message: string;
  weatherSummary?: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: any;
  createdAt: Date;
}

// ============= Provider Interface =============

export interface IWebhookProvider {
  /**
   * Find trips with flight in date range (raw data)
   */
  findUpcomingTrips(startDate: Date, endDate: Date): Promise<RawUpcomingTripRecord[]>;

  /**
   * Find trips with unchecked items in date range (raw data)
   */
  findTripsWithUncheckedItems(startDate: Date, endDate: Date): Promise<RawUncheckedItemsRecord[]>;

  /**
   * Find trips for weather check in date range (raw data)
   */
  findTripsForWeatherCheck(startDate: Date, endDate: Date): Promise<RawTripForWeatherCheckRecord[]>;

  /**
   * Bulk create checklist items
   */
  createWeatherChecklist(data: CreateWeatherChecklistData): Promise<{ count: number }>;

  /**
   * Create a notification
   */
  createWeatherNotification(data: CreateWeatherNotificationData): Promise<NotificationRecord>;
}
