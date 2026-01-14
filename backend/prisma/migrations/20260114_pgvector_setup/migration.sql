-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector columns to ItineraryEmbedding
ALTER TABLE "ItineraryEmbedding" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

-- Add vector columns to KnowledgeEmbedding  
ALTER TABLE "KnowledgeEmbedding" ADD COLUMN IF NOT EXISTS "embedding" vector(1536);

-- Migrate existing JSON embeddings to vector format (ItineraryEmbedding)
UPDATE "ItineraryEmbedding" 
SET "embedding" = (
  SELECT array_agg(elem::float)::vector(1536)
  FROM jsonb_array_elements_text("embeddingJson"::jsonb) AS elem
)
WHERE "embeddingJson" IS NOT NULL 
  AND "embedding" IS NULL;

-- Migrate existing JSON embeddings to vector format (KnowledgeEmbedding)
UPDATE "KnowledgeEmbedding"
SET "embedding" = (
  SELECT array_agg(elem::float)::vector(1536)
  FROM jsonb_array_elements_text("embeddingJson"::jsonb) AS elem
)
WHERE "embeddingJson" IS NOT NULL
  AND "embedding" IS NULL;

-- Create HNSW index for fast similarity search on ItineraryEmbedding
CREATE INDEX IF NOT EXISTS "ItineraryEmbedding_embedding_idx" 
ON "ItineraryEmbedding" 
USING hnsw ("embedding" vector_cosine_ops);

-- Create HNSW index for fast similarity search on KnowledgeEmbedding
CREATE INDEX IF NOT EXISTS "KnowledgeEmbedding_embedding_idx"
ON "KnowledgeEmbedding"
USING hnsw ("embedding" vector_cosine_ops);

-- Drop legacy JSON columns (optional - can be kept for rollback)
-- ALTER TABLE "ItineraryEmbedding" DROP COLUMN IF EXISTS "embeddingJson";
-- ALTER TABLE "KnowledgeEmbedding" DROP COLUMN IF EXISTS "embeddingJson";
