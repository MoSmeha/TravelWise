import { ChunkType as PrismaChunkType } from '@prisma/client';
import prisma from '../lib/prisma';
import { chunkItinerary, ItineraryData } from './chunking.service';
import { batchGenerateEmbeddings, generateEmbedding } from './embedding.service';
import { getOpenAIClient } from '../utils/openai.utils';


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

// Store embeddings for an itinerary using native pgvector
export async function storeItineraryEmbeddings(itinerary: ItineraryData): Promise<number> {
  // Generate chunks
  const chunks = chunkItinerary(itinerary);
  
  // Generate embeddings for all chunks
  const texts = chunks.map(c => c.text);
  const embeddings = await batchGenerateEmbeddings(texts);
  
  // Store in database using raw SQL for vector type
  let stored = 0;
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i];
    const vectorStr = `[${embedding.join(',')}]`;
    
    try {
      // Use raw SQL to insert with native vector type
      await prisma.$executeRaw`
        INSERT INTO "ItineraryEmbedding" (
          "id", "itineraryId", "chunkIndex", "chunkType", "chunkText",
          "placeIds", "dayNumbers", "activityTypes", "embedding", "createdAt"
        ) VALUES (
          ${`cuid_${Date.now()}_${i}`},
          ${chunk.metadata.itineraryId},
          ${chunk.chunkIndex},
          ${chunk.type}::"ChunkType",
          ${chunk.text},
          ${chunk.metadata.placeIds},
          ${chunk.metadata.dayNumbers},
          ${chunk.metadata.activityTypes},
          ${vectorStr}::vector,
          NOW()
        )
      `;
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

// Retrieve relevant chunks for a query using native pgvector
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
  const queryVectorStr = `[${queryEmbedding.join(',')}]`;
  
  // Fetch itinerary to get country for knowledge base filtering
  const itinerary = await prisma.userItinerary.findUnique({
    where: { id: itineraryId },
    select: { country: true }
  });
  const countryCode = itinerary?.country === 'Lebanon' ? 'LB' : 
                      itinerary?.country?.substring(0, 2).toUpperCase() || 'LB';
  
  // 1. Fetch Itinerary Embeddings with native pgvector similarity
  const itineraryChunks = await prisma.$queryRaw<Array<{
    id: string;
    chunkType: string;
    chunkText: string;
    placeIds: string[];
    dayNumbers: number[];
    similarity: number;
  }>>`
    SELECT 
      id,
      "chunkType"::text as "chunkType",
      "chunkText",
      "placeIds",
      "dayNumbers",
      1 - (embedding <=> ${queryVectorStr}::vector) as similarity
    FROM "ItineraryEmbedding"
    WHERE "itineraryId" = ${itineraryId}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${queryVectorStr}::vector
    LIMIT ${config.topK}
  `;
  
  // 2. Fetch Global Knowledge Embeddings with dynamic country filtering
  const knowledgeChunks = await prisma.$queryRaw<Array<{
    id: string;
    content: string;
    similarity: number;
  }>>`
    SELECT 
      id,
      content,
      1 - (embedding <=> ${queryVectorStr}::vector) as similarity
    FROM "KnowledgeEmbedding"
    WHERE "countryCode" = ${countryCode}
      AND embedding IS NOT NULL
    ORDER BY embedding <=> ${queryVectorStr}::vector
    LIMIT ${config.topK}
  `;

  const allChunks = [
    ...itineraryChunks.map(c => ({ 
      ...c, 
      source: 'ITINERARY', 
      type: c.chunkType,
      chunkText: c.chunkText
    })),
    ...knowledgeChunks.map(c => ({ 
      ...c, 
      source: 'KNOWLEDGE_BASE', 
      type: 'KNOWLEDGE',
      chunkType: 'KNOWLEDGE',
      chunkText: c.content,
      placeIds: [] as string[],
      dayNumbers: [] as number[]
    }))
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
  
  // Sort combined results by similarity (already sorted per-source, need to merge)
  const scoredChunks = allChunks.sort((a, b) => b.similarity - a.similarity);
  
  // Log top similarities
  console.log('[RAG] Top 3 similarities:', scoredChunks.slice(0, 3).map(c => ({
    type: c.type,
    similarity: c.similarity.toFixed(3),
    preview: c.chunkText.substring(0, 50)
  })));
  
  // Filter candidates by similarity threshold
  let candidates = scoredChunks
    .filter(c => c.similarity >= config.similarityThreshold)
    .slice(0, config.topK);
  
  // Fallback thresholds if no results
  if (candidates.length === 0) {
    candidates = scoredChunks
      .filter(c => c.similarity >= FALLBACK_THRESHOLD)
      .slice(0, config.topK);
  }

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
      dayNumbers: c.dayNumbers || [],
      placeIds: c.placeIds || [],
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
  const openai = getOpenAIClient();
  
  // Token limit configuration
  const MAX_CONTEXT_TOKENS = 6000;
  
  // Build context strings for each chunk
  const chunkStrings = chunks.map(c => {
    const placeInfo = c.placeIds && c.placeIds.length > 0 ? ` [PlaceIDs: ${c.placeIds.join(', ')}]` : '';
    return `[${c.type}]${placeInfo}\n${c.text}`;
  });
  
  // Token-aware truncation
  let totalTokens = 0;
  const safeChunkStrings: string[] = [];
  
  for (const chunkStr of chunkStrings) {
    // Approximate token count (1 token ≈ 4 chars for English)
    const approxTokens = Math.ceil(chunkStr.length / 4);
    if (totalTokens + approxTokens > MAX_CONTEXT_TOKENS) {
      console.warn(`[RAG] Truncated from ${chunkStrings.length} to ${safeChunkStrings.length} chunks due to token limit`);
      break;
    }
    safeChunkStrings.push(chunkStr);
    totalTokens += approxTokens;
  }
  
  // If we had to truncate and have no chunks, include at least the first one
  if (safeChunkStrings.length === 0 && chunkStrings.length > 0) {
    safeChunkStrings.push(chunkStrings[0]);
  }
  
  const context = safeChunkStrings.join('\n\n---\n\n');

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
