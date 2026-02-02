import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContext, resetAllMocks } from './setup.js';

vi.mock('../modules/checklist/checklist.service.js', () => ({
  getItineraryChecklist: vi.fn(),
  updateItem: vi.fn(),
  createItem: vi.fn(),
  deleteItem: vi.fn(),
  deleteAllItems: vi.fn(),
}));

import * as ChecklistController from '../modules/checklist/checklist.controller.js';
import * as checklistService from '../modules/checklist/checklist.service.js';

const mockItem = {
  id: 'item-123',
  itineraryId: 'itinerary-123',
  category: 'PACKING',
  item: 'Pack bags',
  reason: 'For travel',
  checked: false,
  addedByUser: false,
  dayNumber: null,
  createdAt: new Date(),
};

describe('Checklist Controller', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('GET /api/itineraries/:itineraryId/checklist', () => {
    it('should return checklist items', async () => {
      const { req, res } = createMockContext();
      req.params = { itineraryId: 'itinerary-123' };

      vi.mocked(checklistService.getItineraryChecklist).mockResolvedValue([mockItem] as any);

      await ChecklistController.getChecklist(req, res);

      expect(res.json).toHaveBeenCalledWith({ data: [mockItem] });
    });
  });

  describe('PUT /api/checklist/:itemId', () => {
    it('should update item', async () => {
      const { req, res } = createMockContext();
      req.params = { itemId: 'item-123' };
      req.body = { checked: true };

      vi.mocked(checklistService.updateItem).mockResolvedValue({ ...mockItem, checked: true } as any);

      await ChecklistController.updateItem(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('POST /api/itineraries/:itineraryId/checklist', () => {
    it('should create item', async () => {
      const { req, res } = createMockContext();
      req.params = { itineraryId: 'itinerary-123' };
      req.body = { item: 'New task', category: 'PACKING' };

      vi.mocked(checklistService.createItem).mockResolvedValue(mockItem as any);

      await ChecklistController.createItem(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/checklist/:itemId', () => {
    it('should delete item', async () => {
      const { req, res } = createMockContext();
      req.params = { itemId: 'item-123' };

      vi.mocked(checklistService.deleteItem).mockResolvedValue(undefined);

      await ChecklistController.deleteItem(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });
});
