import { ChunkType } from '@prisma/client';

// ==========================================
// CHUNKING SERVICE
// Chunks itinerary data for RAG embedding
// ==========================================

export interface ItineraryChunk {
  type: ChunkType;
  chunkIndex: number;
  text: string;
  metadata: {
    itineraryId: string;
    placeIds: string[];
    dayNumbers: number[];
    activityTypes: string[];
  };
}

interface PlaceData {
  id: string;
  name: string;
  classification: string;
  category: string;
  description: string;
  costMinUSD?: number | null;
  costMaxUSD?: number | null;
  localTip?: string | null;
  scamWarning?: string | null;
  activityTypes: string[];
  // Google Places data
  rating?: number | null;
  totalRatings?: number | null;
  topReviews?: Array<{ authorName: string; rating: number; text: string }> | null;
  openingHours?: { weekdayText: string[] } | null;
}

interface DayData {
  dayNumber: number;
  theme?: string;
  places: Array<{
    place: PlaceData;
    startTime?: string;
    endTime?: string;
    travelTimeFromPrev?: number;
  }>;
  totalDistanceKm?: number;
  estimatedBudget?: number;
}

interface ItineraryData {
  id: string;
  country: string;
  numberOfDays: number;
  budgetUSD: number;
  travelStyles: string[];
  routeSummary?: string | null;
  days: DayData[];
  checklist?: Array<{
    category: string;
    item: string;
    reason?: string;
  }>;
}

// Chunking configuration
// Chunking configuration (Unused for now)
// const CHUNK_CONFIG = {
//   FULL_SUMMARY: { maxTokens: 500 },
//   DAY_PLAN: { maxTokens: 300, overlapTokens: 50 },
//   PLACE_DETAIL: { maxTokens: 200 },
//   CHECKLIST: { maxTokens: 150 },
//   ROUTE_OVERVIEW: { maxTokens: 250 },
// };

// Format a day into readable text
function formatDayChunk(day: DayData): string {
  const lines: string[] = [];
  
  lines.push(`Day ${day.dayNumber}${day.theme ? `: ${day.theme}` : ''}`);
  
  if (day.estimatedBudget) {
    lines.push(`Budget: ~$${day.estimatedBudget} | Distance: ${day.totalDistanceKm || 'N/A'} km`);
  }
  
  lines.push('');
  
  for (const item of day.places) {
    const place = item.place;
    const timeInfo = item.startTime ? `${item.startTime}-${item.endTime}` : '';
    const costInfo = place.costMinUSD ? `~$${place.costMinUSD}-${place.costMaxUSD}` : 'Free';
    
    lines.push(`- ${place.name} (${place.classification}, ${place.category})`);
    lines.push(`  ${timeInfo} | ${costInfo}`);
    
    if (place.description) {
      lines.push(`  ${place.description.slice(0, 100)}`);
    }
    
    if (place.localTip) {
      lines.push(`  Tip: ${place.localTip}`);
    }
    
    if (item.travelTimeFromPrev) {
      lines.push(`  Travel: ${item.travelTimeFromPrev} min from previous`);
    }
    
    lines.push('');
  }
  
  return lines.join('\n').trim();
}

// Format a place with context
function formatPlaceChunk(place: PlaceData, dayContext: string): string {
  const lines: string[] = [];
  
  lines.push(`${place.name}`);
  lines.push(`Classification: ${place.classification} | Category: ${place.category}`);
  lines.push(`Activities: ${place.activityTypes.join(', ')}`);
  
  // Google Places rating
  if (place.rating && place.totalRatings) {
    lines.push(`Rating: ${place.rating} stars (${place.totalRatings} reviews)`);
  }
  
  lines.push('');
  lines.push(place.description);
  
  if (place.costMinUSD) {
    lines.push(`Cost: $${place.costMinUSD}-$${place.costMaxUSD}`);
  }
  
  // Google Places reviews - CRITICAL for RAG to answer review questions
  if (place.topReviews && place.topReviews.length > 0) {
    lines.push('\nReviews from visitors:');
    place.topReviews.forEach((review, idx) => {
      lines.push(`${idx + 1}. "${review.text.substring(0, 200)}${review.text.length > 200 ? '...' : ''}" - ${review.authorName} (${review.rating} stars)`);
    });
  }
  
  // Opening hours
  if (place.openingHours?.weekdayText && place.openingHours.weekdayText.length > 0) {
    lines.push('\nOpening Hours:');
    place.openingHours.weekdayText.forEach(day => lines.push(`- ${day}`));
  }
  
  if (place.localTip) {
    lines.push(`\nLocal Tip: ${place.localTip}`);
  }
  
  if (place.scamWarning) {
    lines.push(`\nWarning: ${place.scamWarning}`);
  }
  
  lines.push(`\nContext: ${dayContext}`);
  
  return lines.join('\n');
}

// Format checklist items
function formatChecklistChunk(items: Array<{ category: string; item: string; reason?: string }>): string {
  const grouped: Record<string, string[]> = {};
  
  for (const item of items) {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item.reason ? `${item.item} - ${item.reason}` : item.item);
  }
  
  const lines: string[] = ['Packing Checklist:', ''];
  
  for (const [category, categoryItems] of Object.entries(grouped)) {
    lines.push(`${category}:`);
    for (const item of categoryItems) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }
  
  return lines.join('\n').trim();
}

// Format full itinerary summary
function formatFullSummary(itinerary: ItineraryData): string {
  const lines: string[] = [];
  
  lines.push(`Trip to ${itinerary.country}`);
  lines.push(`Duration: ${itinerary.numberOfDays} days | Budget: $${itinerary.budgetUSD}`);
  lines.push(`Travel Styles: ${itinerary.travelStyles.join(', ')}`);
  lines.push('');
  
  if (itinerary.routeSummary) {
    lines.push(`Route: ${itinerary.routeSummary}`);
    lines.push('');
  }
  
  lines.push('Daily Highlights:');
  for (const day of itinerary.days) {
    const placeNames = day.places.slice(0, 3).map(p => p.place.name).join(', ');
    lines.push(`- Day ${day.dayNumber}${day.theme ? ` (${day.theme})` : ''}: ${placeNames}`);
  }
  
  // Collect all unique activity types
  const allActivities = new Set<string>();
  for (const day of itinerary.days) {
    for (const item of day.places) {
      item.place.activityTypes.forEach(a => allActivities.add(a));
    }
  }
  
  lines.push('');
  lines.push(`Activities covered: ${[...allActivities].join(', ')}`);
  
  return lines.join('\n');
}

// Format route overview
function formatRouteOverview(itinerary: ItineraryData): string {
  const lines: string[] = [];
  
  lines.push('Route Overview');
  lines.push('');
  
  for (const day of itinerary.days) {
    lines.push(`Day ${day.dayNumber}:`);
    
    const regions = new Set<string>();
    for (const item of day.places) {
      // Placeholder - in real implementation, would extract region from place
      regions.add(item.place.category);
    }
    
    lines.push(`- Places: ${day.places.map(p => p.place.name).join(' → ')}`);
    if (day.totalDistanceKm) {
      lines.push(`- Distance: ${day.totalDistanceKm} km`);
    }
    lines.push('');
  }
  
  if (itinerary.routeSummary) {
    lines.push(`Summary: ${itinerary.routeSummary}`);
  }
  
  return lines.join('\n');
}

// Main chunking function
export function chunkItinerary(itinerary: ItineraryData): ItineraryChunk[] {
  const chunks: ItineraryChunk[] = [];
  let chunkIndex = 0;
  
  // Collect all place IDs and activity types
  const allPlaceIds: string[] = [];
  const allActivityTypes = new Set<string>();
  
  for (const day of itinerary.days) {
    for (const item of day.places) {
      allPlaceIds.push(item.place.id);
      item.place.activityTypes.forEach(a => allActivityTypes.add(a));
    }
  }
  
  // 1. Full summary chunk
  chunks.push({
    type: 'FULL_SUMMARY',
    chunkIndex: chunkIndex++,
    text: formatFullSummary(itinerary),
    metadata: {
      itineraryId: itinerary.id,
      placeIds: allPlaceIds,
      dayNumbers: itinerary.days.map(d => d.dayNumber),
      activityTypes: [...allActivityTypes],
    },
  });
  
  // 2. Day plan chunks
  for (const day of itinerary.days) {
    const dayPlaceIds = day.places.map(p => p.place.id);
    const dayActivityTypes = new Set<string>();
    day.places.forEach(p => p.place.activityTypes.forEach(a => dayActivityTypes.add(a)));
    
    chunks.push({
      type: 'DAY_PLAN',
      chunkIndex: chunkIndex++,
      text: formatDayChunk(day),
      metadata: {
        itineraryId: itinerary.id,
        placeIds: dayPlaceIds,
        dayNumbers: [day.dayNumber],
        activityTypes: [...dayActivityTypes],
      },
    });
  }
  
  // 3. Place detail chunks
  for (const day of itinerary.days) {
    for (const item of day.places) {
      const dayContext = `Day ${day.dayNumber}${day.theme ? ` - ${day.theme}` : ''}`;
      
      chunks.push({
        type: 'PLACE_DETAIL',
        chunkIndex: chunkIndex++,
        text: formatPlaceChunk(item.place, dayContext),
        metadata: {
          itineraryId: itinerary.id,
          placeIds: [item.place.id],
          dayNumbers: [day.dayNumber],
          activityTypes: item.place.activityTypes,
        },
      });
    }
  }
  
  // 4. Checklist chunk (if available)
  if (itinerary.checklist && itinerary.checklist.length > 0) {
    chunks.push({
      type: 'CHECKLIST',
      chunkIndex: chunkIndex++,
      text: formatChecklistChunk(itinerary.checklist),
      metadata: {
        itineraryId: itinerary.id,
        placeIds: [],
        dayNumbers: [],
        activityTypes: [...allActivityTypes],
      },
    });
  }
  
  // 5. Route overview chunk
  chunks.push({
    type: 'ROUTE_OVERVIEW',
    chunkIndex: chunkIndex++,
    text: formatRouteOverview(itinerary),
    metadata: {
      itineraryId: itinerary.id,
      placeIds: allPlaceIds,
      dayNumbers: itinerary.days.map(d => d.dayNumber),
      activityTypes: [...allActivityTypes],
    },
  });
  
  return chunks;
}

// Export types and helpers
export type { DayData, ItineraryData, PlaceData };

