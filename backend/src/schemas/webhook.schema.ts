/**
 * Webhook Zod Schemas
 * Validation schemas for webhook endpoints
 */

import { z } from 'zod';

// ============= Query Schemas =============

/**
 * Schema for upcoming trips query params
 */
export const upcomingTripsQuerySchema = z.object({
  hoursAhead: z
    .string()
    .optional()
    .default('48')
    .transform(val => parseInt(val, 10))
    .refine(val => !isNaN(val) && val > 0 && val <= 168, {
      message: 'hoursAhead must be a number between 1 and 168',
    }),
});

export type UpcomingTripsQuery = z.infer<typeof upcomingTripsQuerySchema>;

// ============= Body Schemas =============

/**
 * Schema for weather checklist item
 */
const weatherChecklistItemSchema = z.object({
  category: z.string().optional().default('WEATHER'),
  item: z.string().min(1, 'Item name is required'),
  reason: z.string().optional(),
});

/**
 * Schema for adding weather checklist items
 */
export const addWeatherChecklistSchema = z.object({
  itineraryId: z.string().min(1, 'Itinerary ID is required'),
  items: z
    .array(weatherChecklistItemSchema)
    .min(1, 'At least one item is required'),
});

export type AddWeatherChecklistInput = z.infer<typeof addWeatherChecklistSchema>;

/**
 * Schema for sending weather notification
 */
export const sendWeatherNotificationSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  itineraryId: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  weatherSummary: z.string().optional(),
});

export type SendWeatherNotificationInput = z.infer<typeof sendWeatherNotificationSchema>;
