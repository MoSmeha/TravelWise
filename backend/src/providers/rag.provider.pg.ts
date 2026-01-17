import prisma from '../lib/prisma';
import {
  EmbeddingTypeBreakdown,
  IRagProvider,
} from '../provider-contract/rag.provider-contract';

class RagPgProvider implements IRagProvider {
  async itineraryExists(id: string): Promise<boolean> {
    const itinerary = await prisma.userItinerary.findUnique({
      where: { id },
      select: { id: true },
    });
    return itinerary !== null;
  }

  async countEmbeddings(itineraryId: string): Promise<number> {
    return prisma.itineraryEmbedding.count({
      where: { itineraryId },
    });
  }

  async getEmbeddingTypeBreakdown(itineraryId: string): Promise<EmbeddingTypeBreakdown[]> {
    const types = await prisma.itineraryEmbedding.groupBy({
      by: ['chunkType'],
      where: { itineraryId },
      _count: { id: true },
    });

    return types.map((t) => ({
      type: t.chunkType,
      count: t._count.id,
    }));
  }
}

export const ragProvider = new RagPgProvider();

export { RagPgProvider };
