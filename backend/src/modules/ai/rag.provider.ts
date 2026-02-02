import prisma from '../../lib/prisma.js';
import {
  EmbeddingTypeBreakdown,
  IRagProvider,
} from './rag.contract.js';

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
  async storeEmbedding(data: any): Promise<number> {
    const vectorStr = `[${data.embedding.join(',')}]`;
    
    // Use raw SQL to insert with native vector type
    const result = await prisma.$executeRaw`
      INSERT INTO "ItineraryEmbedding" (
        "id", "itineraryId", "chunkIndex", "chunkType", "chunkText",
        "placeIds", "dayNumbers", "activityTypes", "embedding", "createdAt"
      ) VALUES (
        ${data.id},
        ${data.itineraryId},
        ${data.chunkIndex},
        ${data.chunkType}::"ChunkType",
        ${data.chunkText},
        ${data.placeIds},
        ${data.dayNumbers},
        ${data.activityTypes},
        ${vectorStr}::vector,
        NOW()
      )
    `;
    return result;
  }

  async retrieveSimilarChunks(
    embeddingVector: string,
    itineraryId: string,
    limit: number
  ): Promise<any[]> {
    return prisma.$queryRaw`
      SELECT 
        id,
        "chunkType"::text as "chunkType",
        "chunkText",
        "placeIds",
        "dayNumbers",
        1 - (embedding <=> ${embeddingVector}::vector) as similarity
      FROM "ItineraryEmbedding"
      WHERE "itineraryId" = ${itineraryId}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingVector}::vector
      LIMIT ${limit}
    `;
  }

  async retrieveKnowledgeChunks(
    embeddingVector: string,
    countryCode: string,
    limit: number
  ): Promise<any[]> {
    return prisma.$queryRaw`
      SELECT 
        id,
        content,
        1 - (embedding <=> ${embeddingVector}::vector) as similarity
      FROM "KnowledgeEmbedding"
      WHERE "countryCode" = ${countryCode}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingVector}::vector
      LIMIT ${limit}
    `;
  }

  async deleteEmbeddings(itineraryId: string): Promise<number> {
    const result = await prisma.itineraryEmbedding.deleteMany({
      where: { itineraryId },
    });
    return result.count;
  }
}

export const ragProvider = new RagPgProvider();

export { RagPgProvider };
