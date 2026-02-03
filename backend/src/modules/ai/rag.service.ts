import { ChunkType as PrismaChunkType } from '../../generated/prisma/client.js';
import { ragProvider } from './rag.provider.js';
import prisma from '../shared/lib/prisma.js';
import { chunkItinerary, ItineraryData } from './chunking.service.js';
import { batchGenerateEmbeddings, generateEmbedding } from './embedding.service.js';
import { getOpenAIClient } from '../shared/utils/openai.utils.js';
import { RagPrompts } from '../prompts/rag.prompts.js';



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


const FALLBACK_THRESHOLD = 0.3;


function expandQuery(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const queries = [query];
  

  if (lowerQuery.includes('restaurant') || lowerQuery.includes('food') || 
      lowerQuery.includes('eat') || lowerQuery.includes('dining')) {
    queries.push('restaurants cafes food dining places to eat');
    queries.push('local cuisine traditional dishes');
  }
  

  if (lowerQuery.includes('do') || lowerQuery.includes('activity') || lowerQuery.includes('activities')) {
    queries.push('things to do activities attractions');
  }
  

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

interface RAGResponse {
  answer: string;
}


export async function storeItineraryEmbeddings(itinerary: ItineraryData): Promise<number> {

  const chunks = chunkItinerary(itinerary);
  

  const texts = chunks.map(c => c.text);
  const embeddings = await batchGenerateEmbeddings(texts);
  
  // Store using provider (native vector support)
  let stored = 0;
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i];
    
    try {
      await ragProvider.storeEmbedding({
        id: `cuid_${Date.now()}_${i}`,
        itineraryId: chunk.metadata.itineraryId,
        chunkIndex: chunk.chunkIndex,
        chunkType: chunk.type,
        chunkText: chunk.text,
        placeIds: chunk.metadata.placeIds,
        dayNumbers: chunk.metadata.dayNumbers,
        activityTypes: chunk.metadata.activityTypes,
        embedding: embedding
      });
      stored++;
    } catch (error: any) {
      console.error(`Failed to store chunk ${chunk.chunkIndex}:`, error.message);
    }
  }
  
  return stored;
}


export async function retrieveContext(
  query: string,
  itineraryId: string,
  config: RetrievalConfig = DEFAULT_CONFIG
): Promise<RetrievalResult> {

  const expandedQueries = expandQuery(query);
  const enhancedQuery = expandedQueries.join(' ');
  
  if (expandedQueries.length > 1) {
    console.log(`[RAG] Expanded query: "${query}" -> "${enhancedQuery}"`);
  }
  
  const queryEmbedding = await generateEmbedding(enhancedQuery);
  
  // Fetch itinerary to get country for knowledge base filtering
  const itinerary = await prisma.userItinerary.findUnique({
    where: { id: itineraryId },
    select: { country: true }
  });
  const countryCode = itinerary?.country === 'Lebanon' ? 'LB' : 
                      itinerary?.country?.substring(0, 2).toUpperCase() || 'LB';
  

  // Fetch chunks via Provider
  
  const itineraryChunks = await ragProvider.retrieveSimilarChunks(
    `[${queryEmbedding.join(',')}]`,
    itineraryId,
    config.topK
  );
  
  const knowledgeChunks = await ragProvider.retrieveKnowledgeChunks(
    `[${queryEmbedding.join(',')}]`,
    countryCode,
    config.topK // Using topK for now, could be separate config
  );

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
  

  console.log('[RAG] Top 3 similarities:', scoredChunks.slice(0, 3).map(c => ({
    type: c.type,
    similarity: c.similarity.toFixed(3),
    preview: c.chunkText.substring(0, 50)
  })));
  

  let candidates = scoredChunks
    .filter(c => c.similarity >= config.similarityThreshold)
    .slice(0, config.topK);
  

  if (candidates.length === 0) {
    candidates = scoredChunks
      .filter(c => c.similarity >= FALLBACK_THRESHOLD)
      .slice(0, config.topK);
  }


  const diverseChunks = applyDiversityPenalty(candidates, config.diversityPenalty);
  const topChunks = diverseChunks.slice(0, config.reRankTopN);
  
  console.log(`[RAG] Final selection: ${topChunks.length} chunks`);
  

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


export async function generateActionResponse(
  question: string,
  chunks: RetrievalResult['chunks'],
  staleWarning?: string
): Promise<RAGResponse> {
  const openai = getOpenAIClient();
  

  const MAX_CONTEXT_TOKENS = 6000;
  

  const chunkStrings = chunks.map(c => {
    const placeInfo = c.placeIds && c.placeIds.length > 0 ? ` [PlaceIDs: ${c.placeIds.join(', ')}]` : '';
    return `[${c.type}]${placeInfo}\n${c.text}`;
  });
  

  let totalTokens = 0;
  const safeChunkStrings: string[] = [];
  
  for (const chunkStr of chunkStrings) {

    const approxTokens = Math.ceil(chunkStr.length / 4);
    if (totalTokens + approxTokens > MAX_CONTEXT_TOKENS) {
      console.warn(`[RAG] Truncated from ${chunkStrings.length} to ${safeChunkStrings.length} chunks due to token limit`);
      break;
    }
    safeChunkStrings.push(chunkStr);
    totalTokens += approxTokens;
  }
  

  if (safeChunkStrings.length === 0 && chunkStrings.length > 0) {
    safeChunkStrings.push(chunkStrings[0]);
  }
  
  const context = safeChunkStrings.join('\n\n---\n\n');

  const systemPrompt = RagPrompts.systemPrompt(staleWarning);
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.2',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
      ],
      temperature: 0.3,
    });
    
    return { 
      answer: response.choices[0].message.content || 'I could not generate an answer.' 
    };
  } catch (error) {
    console.error('Answer generation failed:', error);
  }
  
  return { answer: 'Sorry, I encountered an error.' };
}


export async function askAboutItinerary(
  question: string,
  itineraryId: string
): Promise<{
  answer: string;
  sources: string[];
  confidence: number;
  staleWarning?: string;
}> {

  const retrieval = await retrieveContext(question, itineraryId);
  

  const hasStale = retrieval.chunks.some(c => c.isStale);
  const staleWarning = hasStale 
    ? 'Some information may be outdated.'
    : undefined;
  

  const result = await generateActionResponse(question, retrieval.chunks, staleWarning);
  
  return {
    answer: result.answer,
    sources: retrieval.sources,
    confidence: retrieval.confidence,
    staleWarning,
  };
}


export async function deleteItineraryEmbeddings(itineraryId: string): Promise<number> {
  return ragProvider.deleteEmbeddings(itineraryId);
}
