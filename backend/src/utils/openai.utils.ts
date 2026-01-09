/**
 * OpenAI client utilities
 * Centralized OpenAI client instantiation and configuration
 */

import OpenAI from 'openai';

// Singleton instance
let openaiClient: OpenAI | null = null;

/**
 * Check if OpenAI API is properly configured
 */
export function isOpenAIConfigured(): boolean {
  const apiKey = process.env.OPENAI_API_KEY;
  return !!apiKey && apiKey !== 'your_openai_api_key_here';
}

/**
 * Get the shared OpenAI client instance
 * Creates a new instance on first call, then reuses it
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * Reset the OpenAI client (useful for testing or config changes)
 */
export function resetOpenAIClient(): void {
  openaiClient = null;
}
