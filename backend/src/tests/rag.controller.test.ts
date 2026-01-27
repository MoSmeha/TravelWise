import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContext, resetAllMocks } from './setup.js';

vi.mock('../services/rag-retrieval.service.js', () => ({
  askAboutItinerary: vi.fn(),
}));

vi.mock('../providers/rag.provider.pg.js', () => ({
  ragProvider: {
    itineraryExists: vi.fn(),
    countEmbeddings: vi.fn(),
    getEmbeddingTypeBreakdown: vi.fn(),
  },
}));

import * as RagController from '../controllers/rag.controller.js';
import { askAboutItinerary } from '../services/rag-retrieval.service.js';
import { ragProvider } from '../providers/rag.provider.pg.js';

describe('RAG Controller', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('POST /api/itineraries/:id/ask', () => {
    it('should answer a question', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'itinerary-123' };
      req.body = { question: 'What restaurants?' };

      vi.mocked(ragProvider.itineraryExists).mockResolvedValue(true);
      vi.mocked(ragProvider.countEmbeddings).mockResolvedValue(10);
      vi.mocked(askAboutItinerary).mockResolvedValue({ answer: 'Answer', sources: [], confidence: 0.9 });

      await RagController.askQuestion(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it('should return 404 when itinerary not found', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'non-existent' };
      req.body = { question: 'Test' };

      vi.mocked(ragProvider.itineraryExists).mockResolvedValue(false);

      await RagController.askQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 400 when embeddings not ready', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'itinerary-123' };
      req.body = { question: 'Test' };

      vi.mocked(ragProvider.itineraryExists).mockResolvedValue(true);
      vi.mocked(ragProvider.countEmbeddings).mockResolvedValue(0);

      await RagController.askQuestion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('GET /api/itineraries/:id/embeddings', () => {
    it('should return embedding status', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'itinerary-123' };

      vi.mocked(ragProvider.countEmbeddings).mockResolvedValue(15);
      vi.mocked(ragProvider.getEmbeddingTypeBreakdown).mockResolvedValue([]);

      await RagController.getEmbeddingStatus(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isReady: true }));
    });
  });
});
