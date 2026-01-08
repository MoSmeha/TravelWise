import { ChunkType as PrismaChunkType } from '@prisma/client';
import prisma from '../lib/prisma';
import { chunkItinerary, ItineraryData } from './chunking.service';
import { batchGenerateEmbeddings, cosineSimilarity, generateEmbedding } from './embedding.service';

// ==========================================
// RAG RETRIEVAL SERVICE
// Retrieves and re-ranks chunks for Q&A
// ==========================================

// Configuration
interface RetrievalConfig {
  topK: number;           // Initial candidates
  reRankTopN: number;     // After re-ranking
  similarityThreshold: number;  // Minimum cosine similarity
  diversityPenalty: number;     // Reduce similar chunks
}

const DEFAULT_CONFIG: RetrievalConfig = {
  topK: 10,
  reRankTopN: 5,
  similarityThreshold: 0.45, // Lower threshold for better recall on generic queries
  diversityPenalty: 0.1,
};

// Fallback threshold for when no results found
const FALLBACK_THRESHOLD = 0.3;

// Query expansion for common travel queries
function expandQuery(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const queries = [query];
  
  // Food/restaurant related
  if (lowerQuery.includes('restaurant') || lowerQuery.includes('food') || 
      lowerQuery.includes('eat') || lowerQuery.includes('dining')) {
    queries.push('restaurants cafes food dining places to eat');
    queries.push('local cuisine traditional dishes');
  }
  
  // Activities
  if (lowerQuery.includes('do') || lowerQuery.includes('activity') || lowerQuery.includes('activities')) {
    queries.push('things to do activities attractions');
  }
  
  // Packing/checklist
  if (lowerQuery.includes('pack') || lowerQuery.includes('bring') || lowerQuery.includes('checklist')) {
    queries.push('packing checklist what to bring essentials');
  }
  
  return queries;
}

interface RetrievalResult {
  chunks: Array<{
    type: PrismaChunkType | 'KNOWLEDGE';
    text: string;
    dayNumbers: number[];
    placeIds: string[];
    similarity: number;
    isStale: boolean;
  }>;
  confidence: number;
  sources: string[];
}

export interface RAGAction {
  type: 'ADD_PLACE' | 'REPLACE_PLACE' | 'REORDER' | 'SUGGEST_ADD_DB';
  placeId?: string; // For existing DB places found in context
  placeName?: string; // For SUGGEST_ADD_DB
  dayNumber?: number;
  order?: number;
  reason: string;
}

interface RAGResponse {
  answer: string;
  actions: RAGAction[];
}

// Store embeddings for an itinerary
export async function storeItineraryEmbeddings(itinerary: ItineraryData): Promise<number> {
  // Generate chunks
  const chunks = chunkItinerary(itinerary);
  
  // Generate embeddings for all chunks
  const texts = chunks.map(c => c.text);
  const embeddings = await batchGenerateEmbeddings(texts);
  
  // Store in database
  let stored = 0;
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i];
    
    try {
      await prisma.itineraryEmbedding.create({
        data: {
          itinerary: {
             connect: { id: chunk.metadata.itineraryId }
          },
          chunkIndex: chunk.chunkIndex,
          chunkType: chunk.type as PrismaChunkType,
          chunkText: chunk.text,
          placeIds: chunk.metadata.placeIds,
          dayNumbers: chunk.metadata.dayNumbers,
          activityTypes: chunk.metadata.activityTypes,
          embeddingJson: embedding,
        },
      });
      stored++;
    } catch (error: any) {
      // Sanitize error message to avoid logging massive vectors
      const message = error.message || String(error);
      const sanitizedMessage = message.length > 500 ? message.substring(0, 500) + '...' : message;
      console.error(`Failed to store chunk ${chunk.chunkIndex}: ${sanitizedMessage}`);
    }
  }
  
  return stored;
}

// Retrieve relevant chunks for a query
export async function retrieveContext(
  query: string,
  itineraryId: string,
  config: RetrievalConfig = DEFAULT_CONFIG
): Promise<RetrievalResult> {
  // Generate query embedding with expansion
  const expandedQueries = expandQuery(query);
  const enhancedQuery = expandedQueries.join(' ');
  
  if (expandedQueries.length > 1) {
    console.log(`[RAG] Expanded query: "${query}" -> "${enhancedQuery}"`);
  }
  
  const queryEmbedding = await generateEmbedding(enhancedQuery);
  
  // 1. Fetch Itinerary Embeddings
  const itineraryChunks = await prisma.itineraryEmbedding.findMany({
    where: { itineraryId },
    orderBy: { chunkIndex: 'asc' },
  });
  
  // 2. Fetch Global Knowledge Embeddings (Reddit)
  // For now, assume LB. Ideally fetch itinerary countryCode.
  const knowledgeChunks = await prisma.knowledgeEmbedding.findMany({
    where: { countryCode: 'LB' }
  });

  const allChunks = [
    ...itineraryChunks.map(c => ({ ...c, source: 'ITINERARY', type: c.chunkType })),
    ...knowledgeChunks.map(c => ({ ...c, source: 'KNOWLEDGE_BASE', type: 'KNOWLEDGE',  chunkText: c.content, chunkType: 'KNOWLEDGE' }))
  ];
  
  if (allChunks.length === 0) {
    console.log('[RAG] No embeddings found at all.');
    return {
      chunks: [],
      confidence: 0,
      sources: [],
    };
  }
  
  console.log(`[RAG] Retrieved ${itineraryChunks.length} itinerary + ${knowledgeChunks.length} knowledge embeddings`);
  
  // Calculate similarity for each chunk
  const scoredChunks = allChunks.map(chunk => {
    const storedEmbedding = chunk.embeddingJson as number[];
    const similarity = storedEmbedding && storedEmbedding.length > 0
      ? cosineSimilarity(queryEmbedding, storedEmbedding)
      : 0;
    
    return {
      ...chunk,
      similarity,
    };
  });
  
  // Sort by similarity
  scoredChunks.sort((a, b) => b.similarity - a.similarity);
  
  // Log top similarities
  console.log('[RAG] Top 3 similarities:', scoredChunks.slice(0, 3).map(c => ({
    type: c.type,
    similarity: c.similarity.toFixed(3),
    preview: c.chunkText.substring(0, 50)
  })));
  
  // Filter candidates
  // We want a mix of Itinerary and Knowledge if possible
  let candidates = scoredChunks
    .filter(c => c.similarity >= config.similarityThreshold)
    .slice(0, config.topK);
  
  // Fallback thresholds...
  if (candidates.length === 0) {
    candidates = scoredChunks
      .filter(c => c.similarity >= FALLBACK_THRESHOLD)
      .slice(0, config.topK);
  }
  
  // Force include top knowledge if relevant and not present? 
  // For now, simple similarity sort is fine.

  // Apply diversity penalty
  const diverseChunks = applyDiversityPenalty(candidates, config.diversityPenalty);
  const topChunks = diverseChunks.slice(0, config.reRankTopN);
  
  console.log(`[RAG] Final selection: ${topChunks.length} chunks`);
  
  // Calculate overall confidence
  const confidence = topChunks.length > 0
    ? topChunks.reduce((sum, c) => sum + c.similarity, 0) / topChunks.length
    : 0;
  
  return {
    chunks: topChunks.map(c => ({
      type: c.type as PrismaChunkType | 'KNOWLEDGE',
      text: c.chunkText,
      dayNumbers: (c as any).dayNumbers || [],
      placeIds: (c as any).placeIds || [], // Extract placeIds from ItineraryEmbedding
      similarity: Math.round(c.similarity * 100) / 100,
      isStale: false,
    })),
    confidence: Math.round(confidence * 100) / 100,
    sources: [...new Set(topChunks.map(c => c.source))],
  };
}

// Apply diversity penalty to reduce redundant chunks
function applyDiversityPenalty<T extends { similarity: number; type: string }>(
  chunks: T[],
  penalty: number
): T[] {
  if (chunks.length <= 1) return chunks;
  
  const result: T[] = [];
  const seenTypes = new Set<string>();
  
  for (const chunk of chunks) {
    if (seenTypes.has(chunk.type)) {
      result.push({
        ...chunk,
        similarity: chunk.similarity * (1 - penalty),
      });
    } else {
      result.push(chunk);
      seenTypes.add(chunk.type);
    }
  }
  
  return result.sort((a, b) => b.similarity - a.similarity);
}

// Generate answer with actions using LLM
export async function generateActionResponse(
  question: string,
  chunks: RetrievalResult['chunks'],
  staleWarning?: string
): Promise<RAGResponse> {
  const { default: OpenAI } = await import('openai');
  
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  
  // Construct context with embedded Place IDs
  const context = chunks.map(c => {
    const placeInfo = c.placeIds && c.placeIds.length > 0 ? ` [PlaceIDs: ${c.placeIds.join(', ')}]` : '';
    return `[${c.type}]${placeInfo}\n${c.text}`;
  }).join('\n\n---\n\n');

  const systemPrompt = `You are a knowledgeable travel assistant for Lebanon.
Answer the user's question completely.

RULES for Places:
1. You operate on a "Single Source of Truth" Place Database.
2. The Context provided contains "chunks" of text. Some chunks have [PlaceIDs: ID1, ID2] associated with them.
3. If the user wants to ADD, REPLACE, or MODIFY the itinerary regarding a place, you must generate a JSON Action.
4. **CRITICAL**: You can ONLY generate 'ADD_PLACE' or 'REPLACE_PLACE' actions for places that have a valid Place ID in the context.
5. If the user asks for a place that is mentioned in the text but does NOT have a Place ID (or if it's a new place entirely), you must generate a 'SUGGEST_ADD_DB' action with the place name.

OUTPUT FORMAT:
Return a JSON object:
{
  "answer": "Your natural language response...",
  "actions": [
    { "type": "ADD_PLACE", "placeId": "...", "dayNumber": 1, "reason": "..." },
    { "type": "SUGGEST_ADD_DB", "placeName": "...", "reason": "..." }
  ]
}

Action Types:
- ADD_PLACE: Add an existing DB place to itinerary. Requires valid 'placeId'.
- REPLACE_PLACE: Replace a place. Requires 'placeId' (new) and specific instruction in 'reason'.
- REORDER: Swap days or reorder.
- SUGGEST_ADD_DB: Suggest ingesting a new place. Use 'placeName'.

${staleWarning ? `Note: ${staleWarning}` : ''}`;
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for structured output
    });
    
    const content = response.choices[0].message.content;
    if (content) {
       return JSON.parse(content) as RAGResponse;
    }
  } catch (error) {
    console.error('Answer generation failed:', error);
  }
  
  return { answer: 'Sorry, I encountered an error.', actions: [] };
}

// Full RAG pipeline: retrieve + generate
export async function askAboutItinerary(
  question: string,
  itineraryId: string
): Promise<{
  answer: string;
  actions: RAGAction[];
  sources: string[];
  confidence: number;
  staleWarning?: string;
}> {
  // Retrieve relevant context
  const retrieval = await retrieveContext(question, itineraryId);
  
  // Check for stale data
  const hasStale = retrieval.chunks.some(c => c.isStale);
  const staleWarning = hasStale 
    ? 'Some information may be outdated.'
    : undefined;
  
  // Generate answer with actions
  const result = await generateActionResponse(question, retrieval.chunks, staleWarning);
  
  return {
    answer: result.answer,
    actions: result.actions || [],
    sources: retrieval.sources,
    confidence: retrieval.confidence,
    staleWarning,
  };
}

// Delete embeddings for an itinerary
export async function deleteItineraryEmbeddings(itineraryId: string): Promise<number> {
  const result = await prisma.itineraryEmbedding.deleteMany({
    where: { itineraryId },
  });
  
  return result.count;
}
