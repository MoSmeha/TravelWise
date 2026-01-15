/**
 * Checklist Provider Contract
 * Defines the interface for checklist-related data operations.
 * Controllers/services depend on this interface, not on concrete implementations.
 */

import { ChecklistCategory } from '@prisma/client';

// ============================================================================
// Input Types (for creating/updating data)
// ============================================================================

export interface CreateChecklistItemData {
  itineraryId: string;
  category: ChecklistCategory;
  item: string;
  reason?: string | null;
  source?: 'ai' | 'user';
}

// ============================================================================
// Output Types (what the provider returns)
// ============================================================================

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

// ============================================================================
// Provider Contract Interface
// ============================================================================

export interface IChecklistProvider {
  // -------------------------------------------------------------------------
  // Read Operations
  // -------------------------------------------------------------------------

  /**
   * Find all checklist items for an itinerary
   */
  findByItineraryId(itineraryId: string): Promise<ChecklistItemRecord[]>;

  /**
   * Find a single checklist item by ID
   */
  findById(id: string): Promise<ChecklistItemRecord | null>;

  // -------------------------------------------------------------------------
  // Write Operations
  // -------------------------------------------------------------------------

  /**
   * Create a new checklist item
   */
  create(data: CreateChecklistItemData): Promise<ChecklistItemRecord>;

  /**
   * Update the isChecked status of a checklist item
   */
  updateIsChecked(id: string, isChecked: boolean): Promise<ChecklistItemRecord>;

  /**
   * Delete a checklist item by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Create multiple checklist items at once (batch insert)
   */
  createMany(items: CreateChecklistItemData[]): Promise<{ count: number }>;
}
