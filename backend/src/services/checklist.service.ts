import { ChecklistCategory } from '../generated/prisma/client.js';
import { checklistProvider } from '../providers/checklist.provider.pg.js';
import {
  ChecklistItemRecord,
  CreateChecklistItemData,
} from '../provider-contract/checklist.provider-contract.js';
import { CreateChecklistItemInput, UpdateChecklistItemInput } from '../schemas/checklist.schema.js';



/**
 * Get all checklist items for an itinerary
 */
export async function getItineraryChecklist(itineraryId: string): Promise<ChecklistItemRecord[]> {
  return checklistProvider.findByItineraryId(itineraryId);
}

/**
 * Update a checklist item's checked status
 */
export async function updateItem(itemId: string, input: UpdateChecklistItemInput): Promise<ChecklistItemRecord> {
  return checklistProvider.updateIsChecked(itemId, input.isChecked);
}

/**
 * Create a custom checklist item
 */
export async function createItem(itineraryId: string, input: CreateChecklistItemInput): Promise<ChecklistItemRecord> {
  return checklistProvider.create({
    itineraryId,
    category: input.category as ChecklistCategory,
    item: input.item,
    reason: input.reason || null,
    source: 'user',
  });
}

/**
 * Delete a checklist item
 */
export async function deleteItem(itemId: string): Promise<void> {
  return checklistProvider.delete(itemId);
}

/**
 * Bulk create checklist items (used by itinerary generation)
 */
export async function createBulkItems(items: CreateChecklistItemData[]): Promise<{ count: number }> {
  return checklistProvider.createMany(items);
}

// Helper functions for logic
// (Dead weather logic removed)

