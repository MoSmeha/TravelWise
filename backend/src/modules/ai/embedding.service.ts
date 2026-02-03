import { CIRCUIT_BREAKERS, CircuitOpenError, withCircuitBreaker } from '../shared/lib/circuit-breaker.js';
import { getOpenAIClient, isOpenAIConfigured } from '../shared/utils/openai.utils.js';



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

    return new Array(PRIMARY_CONFIG.dimensions).fill(0);
  }
}


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

    return texts.map(() => new Array(PRIMARY_CONFIG.dimensions).fill(0));
  }
}



export function getEmbeddingDimensions(): number {
  return PRIMARY_CONFIG.dimensions;
}


export const VECTOR_DIMENSIONS = PRIMARY_CONFIG.dimensions;


export function formatVectorForPg(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
