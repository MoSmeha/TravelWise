
import { ChunkType } from '../../generated/prisma/client.js';


export interface EmbeddingTypeBreakdown {
  type: ChunkType;
  count: number;
}

export interface EmbeddingStatus {
  itineraryId: string;
  embeddingCount: number;
  isReady: boolean;
  chunkTypes: EmbeddingTypeBreakdown[];
}


export interface IRagProvider {
  
  itineraryExists(id: string): Promise<boolean>;

  
  countEmbeddings(itineraryId: string): Promise<number>;

  getEmbeddingTypeBreakdown(itineraryId: string): Promise<EmbeddingTypeBreakdown[]>;

  storeEmbedding(data: any): Promise<number>;

  retrieveSimilarChunks(
    embeddingVector: string,
    itineraryId: string,
    limit: number
  ): Promise<any[]>;

  retrieveKnowledgeChunks(
    embeddingVector: string,
    countryCode: string,
    limit: number
  ): Promise<any[]>;

  deleteEmbeddings(itineraryId: string): Promise<number>;
}
