import { get_encoding, Tiktoken } from 'tiktoken';

// ==========================================
// TOKEN COUNTER UTILITY
// Counts tokens and truncates content for LLM context limits
// ==========================================

// Lazily initialized encoder for GPT-4/GPT-4o (cl100k_base)
let encoder: Tiktoken | null = null;

function getEncoder(): Tiktoken {
  if (!encoder) {
    encoder = get_encoding('cl100k_base');
  }
  return encoder;
}

/**
 * Count the number of tokens in a text string
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  return getEncoder().encode(text).length;
}

/**
 * Truncate a list of chunks to fit within a token limit
 * Returns chunks in order, stopping when limit would be exceeded
 */
export function truncateToTokenLimit(
  chunks: string[],
  maxTokens: number
): string[] {
  let totalTokens = 0;
  const result: string[] = [];
  
  for (const chunk of chunks) {
    const tokens = countTokens(chunk);
    if (totalTokens + tokens > maxTokens) {
      // If adding this chunk would exceed limit, stop
      // But include at least one chunk if result is empty
      if (result.length === 0) {
        result.push(chunk);
      }
      break;
    }
    result.push(chunk);
    totalTokens += tokens;
  }
  
  return result;
}

/**
 * Check if a text exceeds a token limit
 */
export function exceedsTokenLimit(text: string, maxTokens: number): boolean {
  return countTokens(text) > maxTokens;
}

/**
 * Truncate text to fit within a token limit
 */
export function truncateText(text: string, maxTokens: number): string {
  const enc = getEncoder();
  const tokens = enc.encode(text);
  
  if (tokens.length <= maxTokens) {
    return text;
  }
  
  // Decode only the allowed number of tokens
  const truncatedTokens = tokens.slice(0, maxTokens);
  return new TextDecoder().decode(enc.decode(truncatedTokens)) + '...';
}

// Default token limits for different contexts
export const TOKEN_LIMITS = {
  RAG_CONTEXT: 6000,      // Max tokens for RAG context sent to LLM
  SYSTEM_PROMPT: 1000,    // Reserved for system prompt
  USER_QUESTION: 500,     // Reserved for user question
  RESPONSE_BUFFER: 2000,  // Reserved for LLM response
} as const;
