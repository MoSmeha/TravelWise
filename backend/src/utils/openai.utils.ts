import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

export function isOpenAIConfigured(): boolean {
  const apiKey = process.env.OPENAI_API_KEY;
  return !!apiKey && apiKey !== 'your_openai_api_key_here';
}

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export function resetOpenAIClient(): void {
  openaiClient = null;
}
