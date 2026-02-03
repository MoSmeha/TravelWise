import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContext, resetAllMocks } from '../../tests/setup.js';

vi.mock('../shared/config/countries.config.js', () => ({
  getCountriesList: vi.fn(),
  COUNTRIES: { lebanon: { name: 'Lebanon', airports: [{ code: 'BEY' }] } },
  getAirportConfig: vi.fn(),
}));

vi.mock('./itinerary.service.js', () => ({
  generateItinerary: vi.fn(),
  saveItineraryToDb: vi.fn(),
  enrichLocations: vi.fn(),
  buildItineraryResponse: vi.fn(),
  buildItineraryDetailsResponse: vi.fn(),
}));

vi.mock('../ai/rag.service.js', () => ({
  storeItineraryEmbeddings: vi.fn(),
}));

vi.mock('./itinerary.provider.js', () => ({
  itineraryProvider: {
    findUserItineraries: vi.fn(),
    findItineraryById: vi.fn(),
    deleteItinerary: vi.fn(),
  },
}));

vi.mock('../shared/utils/enum-mappers.js', () => ({
  parseBudgetLevel: vi.fn((level) => level),
  parseTravelStyles: vi.fn((styles) => styles || []),
}));

import * as ItineraryController from './itinerary.controller.js';
import { getCountriesList } from '../shared/config/countries.config.js';
import { itineraryProvider } from './itinerary.provider.js';

const mockItinerary = { id: 'itinerary-123', userId: 'test-user-id-123', country: 'Lebanon' };

describe('Itinerary Controller', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('GET /api/itineraries/countries', () => {
    it('should return countries', async () => {
      const { req, res } = createMockContext();

      vi.mocked(getCountriesList).mockReturnValue([{ name: 'Lebanon', code: 'LB' }] as any);

      await ItineraryController.getCountries(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('POST /api/itineraries/generate', () => {
    it('should return 401 when not authenticated', async () => {
      const { req, res } = createMockContext();
      req.user = undefined;
      req.body = { cityId: 'lebanon', numberOfDays: 3 };

      await ItineraryController.generate(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('GET /api/itineraries', () => {
    it('should return user itineraries', async () => {
      const { req, res } = createMockContext();

      vi.mocked(itineraryProvider.findUserItineraries).mockResolvedValue([mockItinerary as any]);

      await ItineraryController.listUserItineraries(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('GET /api/itineraries/:id', () => {
    it('should return 404 when not found', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'non-existent' };

      vi.mocked(itineraryProvider.findItineraryById).mockResolvedValue(null);

      await ItineraryController.getItineraryDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('DELETE /api/itineraries/:id', () => {
    it('should return 403 when not owner', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'itinerary-123' };

      vi.mocked(itineraryProvider.findItineraryById).mockResolvedValue({ ...mockItinerary, userId: 'other-user' } as any);

      await ItineraryController.deleteItinerary(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should delete itinerary', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'itinerary-123' };

      vi.mocked(itineraryProvider.findItineraryById).mockResolvedValue(mockItinerary as any);
      vi.mocked(itineraryProvider.deleteItinerary).mockResolvedValue(undefined);

      await ItineraryController.deleteItinerary(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
    });
  });
});
