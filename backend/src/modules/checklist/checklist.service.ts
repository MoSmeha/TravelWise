import { ChecklistCategory } from '../../generated/prisma/client.js';
import { checklistProvider } from './checklist.provider.js';
import {
  ChecklistItemRecord,
  CreateChecklistItemData,
} from './checklist.contract.js';
import { CreateChecklistItemInput, UpdateChecklistItemInput } from '../../schemas/checklist.schema.js';




export async function getItineraryChecklist(itineraryId: string): Promise<ChecklistItemRecord[]> {
  return checklistProvider.findByItineraryId(itineraryId);
}


export async function updateItem(itemId: string, input: UpdateChecklistItemInput): Promise<ChecklistItemRecord> {
  return checklistProvider.updateIsChecked(itemId, input.isChecked);
}


export async function createItem(itineraryId: string, input: CreateChecklistItemInput): Promise<ChecklistItemRecord> {
  return checklistProvider.create({
    itineraryId,
    category: input.category as ChecklistCategory,
    item: input.item,
    reason: input.reason || null,
    source: 'user',
  });
}


export async function deleteItem(itemId: string): Promise<void> {
  return checklistProvider.delete(itemId);
}


export async function deleteAllItems(itineraryId: string): Promise<{ count: number }> {
  return checklistProvider.deleteAll(itineraryId);
}


export async function createBulkItems(items: CreateChecklistItemData[]): Promise<{ count: number }> {
  return checklistProvider.createMany(items);
}



