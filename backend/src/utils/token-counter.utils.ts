import { get_encoding, Tiktoken } from 'tiktoken';

let encoder: Tiktoken | null = null;

function getEncoder(): Tiktoken {
  if (!encoder) {
    encoder = get_encoding('cl100k_base');
  }
  return encoder;
}

export function countTokens(text: string): number {
  if (!text) return 0;
  return getEncoder().encode(text).length;
}

export function truncateToTokenLimit(
  chunks: string[],
  maxTokens: number
): string[] {
  let totalTokens = 0;
  const result: string[] = [];
  
  for (const chunk of chunks) {
    const tokens = countTokens(chunk);
    if (totalTokens + tokens > maxTokens) {
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

export function exceedsTokenLimit(text: string, maxTokens: number): boolean {
  return countTokens(text) > maxTokens;
}

export function truncateText(text: string, maxTokens: number): string {
  const enc = getEncoder();
  const tokens = enc.encode(text);
  
  if (tokens.length <= maxTokens) {
    return text;
  }
  
  const truncatedTokens = tokens.slice(0, maxTokens);
  return new TextDecoder().decode(enc.decode(truncatedTokens)) + '...';
}

export const TOKEN_LIMITS = {
  RAG_CONTEXT: 6000,
  SYSTEM_PROMPT: 1000,
  USER_QUESTION: 500,
  RESPONSE_BUFFER: 2000,
} as const;
