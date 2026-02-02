import { Request, Response } from 'express';
import { AskQuestionInput } from '../../schemas/itinerary.schema.js';
import { askAboutItinerary } from './rag.service.js';
import { ragProvider } from './rag.provider.js';


export async function askQuestion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { question } = req.body as AskQuestionInput;


    const itineraryExists = await ragProvider.itineraryExists(id);

    if (!itineraryExists) {
      return res.status(404).json({ error: 'Itinerary not found' });
    }


    const embeddingCount = await ragProvider.countEmbeddings(id);

    if (embeddingCount === 0) {
      return res.status(400).json({
        error: 'Embeddings not generated yet',
        message:
          'Please wait for the itinerary to be fully processed before asking questions.',
      });
    }

    console.log(` RAG Q&A for itinerary ${id}: "${question}"`);


    const result = await askAboutItinerary(question, id);

    return res.json({
      answer: result.answer,
      sources: result.sources,
      confidence: result.confidence,
      staleWarning: result.staleWarning,
    });
  } catch (error) {
    console.error('Error processing question:', error);
    return res.status(500).json({ error: 'Failed to process question' });
  }
}




export async function getEmbeddingStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const [count, types] = await Promise.all([
      ragProvider.countEmbeddings(id),
      ragProvider.getEmbeddingTypeBreakdown(id),
    ]);

    res.json({
      itineraryId: id,
      embeddingCount: count,
      isReady: count > 0,
      chunkTypes: types.map((t) => ({
        type: t.type,
        count: t.count,
      })),
    });
  } catch (error) {
    console.error('Error checking embedding status:', error);
    res.status(500).json({ error: 'Failed to check embedding status' });
  }
}
