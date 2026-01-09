/**
 * Checklist Zod Schemas
 * Validation schemas for checklist-related endpoints
 */

import { z } from 'zod';

/**
 * Schema for creating a checklist item
 */
export const createChecklistItemSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  item: z.string().min(1, 'Item is required'),
  reason: z.string().optional(),
});

export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>;

/**
 * Schema for updating a checklist item
 */
export const updateChecklistItemSchema = z.object({
  isChecked: z.boolean(),
});

export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;

/**
 * Schema for itinerary ID param
 */
export const checklistItineraryParamSchema = z.object({
  itineraryId: z.string().min(1, 'Itinerary ID is required'),
});

export type ChecklistItineraryParam = z.infer<typeof checklistItineraryParamSchema>;

/**
 * Schema for item ID param
 */
export const checklistItemParamSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
});

export type ChecklistItemParam = z.infer<typeof checklistItemParamSchema>;
