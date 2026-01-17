
import { ChunkType } from '@prisma/client';


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
}
