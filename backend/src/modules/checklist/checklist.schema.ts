

import { z } from 'zod';


export const createChecklistItemSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  item: z.string().min(1, 'Item is required'),
  reason: z.string().optional(),
});

export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>;


export const updateChecklistItemSchema = z.object({
  isChecked: z.boolean(),
});

export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;


export const checklistItineraryParamSchema = z.object({
  itineraryId: z.string().min(1, 'Itinerary ID is required'),
});

export type ChecklistItineraryParam = z.infer<typeof checklistItineraryParamSchema>;


export const checklistItemParamSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
});

export type ChecklistItemParam = z.infer<typeof checklistItemParamSchema>;
