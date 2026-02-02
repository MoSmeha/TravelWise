import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContext, resetAllMocks } from '../../tests/setup.js';

vi.mock('./places.service.js', () => ({
  placesService: {
    getPhotosAndReviews: vi.fn(),
    getDirections: vi.fn(),
    searchPlace: vi.fn(),
    getCities: vi.fn(),
    getCategories: vi.fn(),
    listPlaces: vi.fn(),
    getPlaceById: vi.fn(),
  },
}));

import * as PlacesController from './places.controller.js';
import { placesService } from './places.service.js';

const mockPlace = { id: 'place-123', name: 'Test Restaurant' };

describe('Places Controller', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('GET /api/places/photos', () => {
    it('should return photos', async () => {
      const { req, res } = createMockContext();
      req.query = { name: 'Test Place' };

      vi.mocked(placesService.getPhotosAndReviews).mockResolvedValue({ photos: [] } as any);

      await PlacesController.getPhotos(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('GET /api/places/directions', () => {
    it('should return 400 when missing coordinates', async () => {
      const { req, res } = createMockContext();
      req.query = { originLat: '33.89' };

      await PlacesController.getDirections(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('GET /api/places/cities', () => {
    it('should return cities', async () => {
      const { req, res } = createMockContext();

      vi.mocked(placesService.getCities).mockResolvedValue([{ city: 'Beirut', count: 10 }] as any);

      await PlacesController.getCities(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('GET /api/places', () => {
    it('should return places', async () => {
      const { req, res } = createMockContext();
      req.query = { city: 'Beirut' };

      vi.mocked(placesService.listPlaces).mockResolvedValue({ data: [mockPlace] } as any);

      await PlacesController.listPlaces(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('GET /api/places/:id', () => {
    it('should return 404 when not found', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'non-existent' };

      vi.mocked(placesService.getPlaceById).mockResolvedValue(null);

      await PlacesController.getPlaceById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
