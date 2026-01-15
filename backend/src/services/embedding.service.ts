import { CIRCUIT_BREAKERS, CircuitOpenError, withCircuitBreaker } from '../lib/circuit-breaker';
import { getOpenAIClient, isOpenAIConfigured } from '../utils/openai.utils';


// Configuration
interface EmbeddingConfig {
  provider: 'openai' | 'local';
  model: string;
  dimensions: number;
}

const PRIMARY_CONFIG: EmbeddingConfig = {
  provider: 'openai',
  model: 'text-embedding-ada-002',
  dimensions: 1536,
};


// Generate a single embedding
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!isOpenAIConfigured()) {
    console.warn('OpenAI not configured, returning zero vector');
    return new Array(PRIMARY_CONFIG.dimensions).fill(0);
  }
  
  try {
    const result = await withCircuitBreaker(
      CIRCUIT_BREAKERS.openAI,
      'OpenAI Embeddings',
      async () => {
        const response = await getOpenAIClient().embeddings.create({
          model: PRIMARY_CONFIG.model,
          input: text,
        });
        return response.data[0].embedding;
      }
    );
    
    return result;
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      console.warn('OpenAI circuit breaker is open for embeddings');
    }
    console.error('Embedding generation failed:', error);
    // Return zero vector as fallback
    return new Array(PRIMARY_CONFIG.dimensions).fill(0);
  }
}

// Generate embeddings in batch
export async function batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!isOpenAIConfigured()) {
    console.warn('OpenAI not configured, returning zero vectors');
    return texts.map(() => new Array(PRIMARY_CONFIG.dimensions).fill(0));
  }
  
  if (texts.length === 0) return [];
  
  try {
    const result = await withCircuitBreaker(
      CIRCUIT_BREAKERS.openAI,
      'OpenAI Embeddings',
      async () => {
        const response = await getOpenAIClient().embeddings.create({
          model: PRIMARY_CONFIG.model,
          input: texts,
        });
        return response.data.map(d => d.embedding);
      }
    );
    
    return result;
  } catch (error) {
    console.error('Batch embedding generation failed:', error);
    // Return zero vectors as fallback
    return texts.map(() => new Array(PRIMARY_CONFIG.dimensions).fill(0));
  }
}


// Get embedding dimensions for current config
export function getEmbeddingDimensions(): number {
  return PRIMARY_CONFIG.dimensions;
}

// Vector dimension constant for pgvector
export const VECTOR_DIMENSIONS = PRIMARY_CONFIG.dimensions;

// Format embedding array as pgvector-compatible string
export function formatVectorForPg(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
