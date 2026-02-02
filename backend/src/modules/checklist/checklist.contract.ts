
import { ChecklistCategory } from '../../generated/prisma/client.js';

export interface CreateChecklistItemData {
  itineraryId: string;
  category: ChecklistCategory;
  item: string;
  reason?: string | null;
  source?: 'ai' | 'user';
}

export interface ChecklistItemRecord {
  id: string;
  itineraryId: string;
  category: ChecklistCategory;
  item: string;
  reason: string | null;
  isChecked: boolean;
  source: string | null;
  createdAt: Date;
}


export interface IChecklistProvider {
  
  findByItineraryId(itineraryId: string): Promise<ChecklistItemRecord[]>;

  findById(id: string): Promise<ChecklistItemRecord | null>;  
  create(data: CreateChecklistItemData): Promise<ChecklistItemRecord>;

  
  updateIsChecked(id: string, isChecked: boolean): Promise<ChecklistItemRecord>;

  
  delete(id: string): Promise<void>;

  deleteAll(itineraryId: string): Promise<{ count: number }>;  
  createMany(items: CreateChecklistItemData[]): Promise<{ count: number }>;
}
