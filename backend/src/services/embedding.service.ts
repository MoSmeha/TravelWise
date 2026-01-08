import OpenAI from 'openai';
import { CIRCUIT_BREAKERS, CircuitOpenError, withCircuitBreaker } from '../lib/circuit-breaker';

// ==========================================
// EMBEDDING SERVICE
// Generates embeddings for RAG using OpenAI with fallback
// ==========================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

// Check if OpenAI is configured
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here';
}

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
        const response = await openai.embeddings.create({
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
        const response = await openai.embeddings.create({
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

// Calculate cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Get embedding dimensions for current config
export function getEmbeddingDimensions(): number {
  return PRIMARY_CONFIG.dimensions;
}
