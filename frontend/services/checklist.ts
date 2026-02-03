import { z } from 'zod';
import api from './api-client';
import type { ChecklistItem } from '../types/api';
import { ChecklistItemSchema } from '../types/schemas';

export const checklistService = {
  async getChecklist(itineraryId: string): Promise<ChecklistItem[]> {
    const response = await api.get<{ data: ChecklistItem[] }>(`/checklist/${itineraryId}`);
    return z.array(ChecklistItemSchema).parse(response.data.data || []);
  },

  async updateChecklistItemStatus(itemId: string, isChecked: boolean): Promise<ChecklistItem> {
    const response = await api.patch<{ data: ChecklistItem }>(`/checklist/${itemId}`, { isChecked });
    return ChecklistItemSchema.parse(response.data.data);
  },

  async addChecklistItem(itineraryId: string, item: string, category: string = 'ESSENTIALS'): Promise<ChecklistItem> {
    const response = await api.post<{ data: ChecklistItem }>(`/checklist/${itineraryId}`, { 
      item, 
      category,
      reason: 'User added item'
    });
    return ChecklistItemSchema.parse(response.data.data);
  },

  async deleteChecklistItem(itemId: string): Promise<void> {
    await api.delete(`/checklist/${itemId}`);
  },

  async deleteAllChecklistItems(itineraryId: string): Promise<{ deleted: number }> {
    const response = await api.delete<{ success: boolean; deleted: number }>(`/checklist/all/${itineraryId}`);
    return { deleted: response.data.deleted };
  },
};
