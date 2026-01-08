import express from 'express';
import prisma from '../lib/prisma';
import { askAboutItinerary } from '../services/rag-retrieval.service';

const router = express.Router();

// ==========================================
// RAG API ROUTES
// Q&A endpoint for itinerary queries
// ==========================================

// POST /api/itinerary/:id/ask - Ask a question about an itinerary
router.post('/:id/ask', async (req, res) => {
  try {
    const { id } = req.params;
    const { question } = req.body;
    
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    // Check if itinerary exists
    const itinerary = await prisma.userItinerary.findUnique({
      where: { id },
    });
    
    if (!itinerary) {
      return res.status(404).json({ error: 'Itinerary not found' });
    }
    
    // Check if embeddings exist
    const embeddingCount = await prisma.itineraryEmbedding.count({
      where: { itineraryId: id },
    });
    
    if (embeddingCount === 0) {
      return res.status(400).json({ 
        error: 'Embeddings not generated yet',
        message: 'Please wait for the itinerary to be fully processed before asking questions.',
      });
    }
    
    // Run RAG pipeline
    const result = await askAboutItinerary(question, id);
    
    return res.json({
      answer: result.answer,
      actions: result.actions,
      sources: result.sources,
      confidence: result.confidence,
      staleWarning: result.staleWarning,
    });
  } catch (error) {
    console.error('Error processing question:', error);
    return res.status(500).json({ error: 'Failed to process question' });
  }
});

// GET /api/itinerary/:id/embeddings/status - Check embedding status
router.get('/:id/embeddings/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    const count = await prisma.itineraryEmbedding.count({
      where: { itineraryId: id },
    });
    
    const types = await prisma.itineraryEmbedding.groupBy({
      by: ['chunkType'],
      where: { itineraryId: id },
      _count: { id: true },
    });
    
    res.json({
      itineraryId: id,
      embeddingCount: count,
      isReady: count > 0,
      chunkTypes: types.map(t => ({
        type: t.chunkType,
        count: t._count.id,
      })),
    });
  } catch (error) {
    console.error('Error checking embedding status:', error);
    res.status(500).json({ error: 'Failed to check embedding status' });
  }
});

export default router;
