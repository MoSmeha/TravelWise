/**
 * RAG Provider Contract
 * Defines the interface for RAG-related data operations.
 * Controllers/services depend on this interface, not on concrete implementations.
 */

import { ChunkType } from '@prisma/client';

// ============================================================================
// Output Types (what the provider returns)
// ============================================================================

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

// ============================================================================
// Provider Contract Interface
// ============================================================================

export interface IRagProvider {
  // -------------------------------------------------------------------------
  // Read Operations
  // -------------------------------------------------------------------------

  /**
   * Check if an itinerary exists
   */
  itineraryExists(id: string): Promise<boolean>;

  /**
   * Count embeddings for an itinerary
   */
  countEmbeddings(itineraryId: string): Promise<number>;

  /**
   * Get embedding breakdown by chunk type
   */
  getEmbeddingTypeBreakdown(itineraryId: string): Promise<EmbeddingTypeBreakdown[]>;
}
