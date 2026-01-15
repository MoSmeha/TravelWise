/**
 * Checklist Provider - PostgreSQL Implementation
 * Implements the IChecklistProvider interface using Prisma/PostgreSQL
 */

import prisma from '../lib/prisma';
import {
  ChecklistItemRecord,
  CreateChecklistItemData,
  IChecklistProvider,
} from '../provider-contract/checklist.provider-contract';

/**
 * PostgreSQL implementation of the Checklist Provider
 */
class ChecklistPgProvider implements IChecklistProvider {
  // -------------------------------------------------------------------------
  // Read Operations
  // -------------------------------------------------------------------------

  async findByItineraryId(itineraryId: string): Promise<ChecklistItemRecord[]> {
    return prisma.checklistItem.findMany({
      where: { itineraryId },
      orderBy: [
        { category: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async findById(id: string): Promise<ChecklistItemRecord | null> {
    return prisma.checklistItem.findUnique({
      where: { id },
    });
  }

  // -------------------------------------------------------------------------
  // Write Operations
  // -------------------------------------------------------------------------

  async create(data: CreateChecklistItemData): Promise<ChecklistItemRecord> {
    return prisma.checklistItem.create({
      data: {
        itineraryId: data.itineraryId,
        category: data.category,
        item: data.item,
        reason: data.reason || null,
        source: data.source || 'user',
      },
    });
  }

  async updateIsChecked(id: string, isChecked: boolean): Promise<ChecklistItemRecord> {
    return prisma.checklistItem.update({
      where: { id },
      data: { isChecked },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.checklistItem.delete({
      where: { id },
    });
  }

  async createMany(items: CreateChecklistItemData[]): Promise<{ count: number }> {
    const result = await prisma.checklistItem.createMany({
      data: items.map((item) => ({
        itineraryId: item.itineraryId,
        category: item.category,
        item: item.item,
        reason: item.reason || null,
        source: item.source || 'ai',
      })),
    });
    return { count: result.count };
  }
}

// Export a singleton instance
export const checklistProvider = new ChecklistPgProvider();

// Also export the class for testing (allows mocking)
export { ChecklistPgProvider };
