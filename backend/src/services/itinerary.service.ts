import { BudgetLevel, LocationClassification, TravelStyle } from '@prisma/client';
import OpenAI from 'openai';
import prisma from '../lib/prisma';

// Define Place type locally since it's not exported from Prisma
type Place = {
  id: string;
  name: string;
  classification: LocationClassification;
  category: string;
  description: string;
  costMinUSD?: number | null;
  costMaxUSD?: number | null;
  crowdLevel?: string | null;
  bestTimeToVisit?: string | null;
  latitude: number;
  longitude: number;
  scamWarning?: string | null;
  city: string;
  [key: string]: any; // For additional fields
};

interface GenerateItineraryParams {
  cityId: string; // Treated as city name or ID
  numberOfDays: number;
  budgetLevel: BudgetLevel;
  travelStyle: TravelStyle;
  budgetUSD: number;
  userId?: string;
  countryId?: string;
}

interface ItineraryDayResult {
  dayNumber: number;
  description: string;
  routeDescription: string;
  locations: Place[];
  theme?: string;
}

export interface ItineraryResult {
  itinerary: {
    numberOfDays: number;
    budgetUSD: number;
    budgetLevel?: BudgetLevel;
    travelStyle?: TravelStyle;
  };
  days: ItineraryDayResult[];
  totalEstimatedCostUSD: number;
  routeSummary: string;
  warnings: Array<{ title: string; description: string }>;
  touristTraps: Array<{ name: string; reason: string }>;
  localTips: string[];
}

// Calculate distance between two lat/lng points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Group locations by proximity
function clusterLocationsByProximity(locations: Place[], maxPerDay: number): Place[][] {
  if (locations.length === 0) return [];
  
  const clusters: Place[][] = [];
  const remaining = [...locations];
  
  while (remaining.length > 0) {
    const cluster: Place[] = [remaining.shift()!];
    
    while (cluster.length < maxPerDay && remaining.length > 0) {
      // Find closest location to cluster centroid
      const centroidLat = cluster.reduce((sum, loc) => sum + loc.latitude, 0) / cluster.length;
      const centroidLon = cluster.reduce((sum, loc) => sum + loc.longitude, 0) / cluster.length;
      
      let closestIdx = -1;
      let minDistance = Infinity;
      
      remaining.forEach((loc, idx) => {
        const dist = calculateDistance(centroidLat, centroidLon, loc.latitude, loc.longitude);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = idx;
        }
      });
      
      if (closestIdx !== -1) {
        cluster.push(remaining.splice(closestIdx, 1)[0]);
      } else {
        break;
      }
    }
    
    clusters.push(cluster);
  }
  
  return clusters;
}

// Generate AI Polish: warnings, tourist traps, and local tips
async function generateAIPolish(
  days: ItineraryDayResult[],
  cityName: string
): Promise<{
  warnings: Array<{ title: string; description: string }>;
  touristTraps: Array<{ name: string; reason: string }>;
  localTips: string[];
}> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  if (!process.env.OPENAI_API_KEY) {
    return { warnings: [], touristTraps: [], localTips: [] };
  }
  
  // Build context from itinerary
  const locationNames = days.flatMap(d => d.locations.map((l: any) => l.name)).join(', ');
  
  const prompt = `You are a travel expert for ${cityName}. Based on this itinerary visiting: ${locationNames}

Generate:
1. 2-3 important regional warnings (safety, scams, health)
2. 2-3 tourist traps to avoid in this area
3. 3-5 local tips for travelers

Format as JSON:
{
  "warnings": [{"title": "...", "description": "..."}],
  "touristTraps": [{"name": "...", "reason": "..."}],
  "localTips": ["...", "..."]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });
    
    const content = response.choices[0].message.content;
    if (content) {
      const parsed = JSON.parse(content);
      return {
        warnings: parsed.warnings || [],
        touristTraps: parsed.touristTraps || [],
        localTips: parsed.localTips || [],
      };
    }
  } catch (error) {
    console.error('AI Polish generation failed:', error);
  }
  
  return { warnings: [], touristTraps: [], localTips: [] };
}

export async function generateItinerary(params: GenerateItineraryParams): Promise<ItineraryResult> {
  const { cityId, numberOfDays, budgetLevel, travelStyle, budgetUSD } = params;
  
  // Resolve city name
  let cityName = cityId;
  const cityObj = await prisma.city.findUnique({ where: { id: cityId } });
  if (cityObj) {
    cityName = cityObj.name;
  }
  
  // Fetch places
  // We use classification filters to ensure quality
  const categoryMap: Record<TravelStyle, string[]> = {
    NATURE: ['BEACH', 'HIKING', 'PARK', 'VIEWPOINT', 'OTHER'],
    FOOD: ['RESTAURANT', 'CAFE', 'MARKET', 'BAR'],
    CULTURE: ['HISTORICAL_SITE', 'MUSEUM', 'RELIGIOUS_SITE', 'MARKET'],
    NIGHTLIFE: ['BAR', 'NIGHTCLUB', 'CAFE'],
    MIXED: [], 
  };
  
  const relevantCategories = travelStyle !== 'MIXED' ? (categoryMap[travelStyle] || []) : [];
  
  // 1. Try to fetch places matching the specific travel style first
  let places = await prisma.place.findMany({
    where: {
      classification: {
        not: LocationClassification.TOURIST_TRAP,
      },
      category: relevantCategories.length > 0 ? { in: relevantCategories as any } : undefined,
    },
    orderBy: [
      { classification: 'asc' }, // Hidden gems first
      { popularity: 'desc' }, 
    ],
    take: 100,
  });
  
  // 2. Fallback: If not enough places found for the style, fetch generic valid places
  if (places.length < numberOfDays * 2) {
    if (relevantCategories.length > 0) {
      console.log(`[ItineraryService] Not enough places for style ${travelStyle} (${places.length} found). Fetching mixed fallback.`);
    }
    
    const fallbackPlaces = await prisma.place.findMany({
      where: {
        classification: {
          not: LocationClassification.TOURIST_TRAP,
        },
      },
      orderBy: [
        { classification: 'asc' },
        { popularity: 'desc' }, 
      ],
      take: 100, // Fetch top 100 generic places
    });
    
    // Merge results, prioritizing the specific style matches
    const existingIds = new Set(places.map(p => p.id));
    for (const p of fallbackPlaces) {
      if (!existingIds.has(p.id)) {
        places.push(p);
      }
    }
  }
  
  // Filter by travel style
  // Filtering logic moved into the query above 
  
  // Use filtered list
  // Use filtered places directly
  // places = filteredPlaces;
  
  // Filter by City name if strictly required
  // If we have a valid city name and enough places match it, filter.
  // Otherwise ignore city filter (country-wide fallback).
  if (cityName && places.some(p => p.city.toLowerCase() === cityName.toLowerCase())) {
     const cityFiltered = places.filter(p => p.city.toLowerCase() === cityName.toLowerCase());
     if (cityFiltered.length >= numberOfDays * 2) {
        places = cityFiltered;
     }
  }
  
  // Calculate locations per day (3-5 per day)
  const locationsPerDay = Math.min(5, Math.max(3, Math.ceil(places.length / numberOfDays)));
  
  const clusters = clusterLocationsByProximity(places, locationsPerDay);
  
  // Assign clusters to days
  const dailyClustersSlice = clusters.slice(0, numberOfDays);
  
  const days = dailyClustersSlice.map((cluster, i) => {
    const locations = cluster.map(p => p.name).join(' → ');
    // Determine theme based on dominant category
    const categories = cluster.map(p => p.category);
    const theme = categories.sort((a,b) => 
      categories.filter(v => v===a).length - categories.filter(v => v===b).length
    ).pop();

    return {
      dayNumber: i + 1,
      description: `Exploring ${cluster[0].city}: ${cluster.map(p => p.category).join(', ')}`,
      routeDescription: locations,
      locations: cluster,
      theme: theme ? theme.toString() : 'Mixed'
    };
  });
  
  // Calculate costs
  const totalEstimatedCostUSD = days.reduce((sum, day) => {
    return sum + day.locations.reduce((dSum, loc) => dSum + (loc.costMinUSD || 20), 0);
  }, 0);
  
  // Mini-AI Polish: Generate warnings, tourist traps, and local tips
  let warnings: Array<{ title: string; description: string }> = [];
  let touristTraps: Array<{ name: string; reason: string }> = [];
  let localTips: string[] = [];
  
  try {
    const aiPolish = await generateAIPolish(days, cityName);
    warnings = aiPolish.warnings;
    touristTraps = aiPolish.touristTraps;
    localTips = aiPolish.localTips;
  } catch (error) {
    console.error('AI Polish failed (non-critical):', error);
    // Continue without AI polish
  }
  
  return {
    itinerary: {
      numberOfDays,
      budgetUSD,
      budgetLevel,
      travelStyle,
    },
    days,
    totalEstimatedCostUSD,
    routeSummary: `${numberOfDays} days in ${days[0]?.locations[0]?.city || cityName}`,
    warnings,
    touristTraps,
    localTips,
  };
}

// Function to save the generated itinerary to the database
export async function saveItineraryToDb(
  userId: string | undefined,
  input: any,
  generated: ItineraryResult,
  countryName: string,
  airportCode: string
) {
  // Create UserItinerary
  const itinerary = await prisma.userItinerary.create({
    data: {
      userId,
      country: countryName,
      airportCode,
      numberOfDays: input.numberOfDays,
      budgetUSD: input.budgetUSD,
      travelStyles: input.travelStyle ? [input.travelStyle] : [],
      flightDate: input.flightDate ? new Date(input.flightDate) : null,
      totalEstimatedCostUSD: generated.totalEstimatedCostUSD,
      routeSummary: generated.routeSummary,
    },
  });
  
  // Create ItineraryItems
  for (const day of generated.days) {
    let order = 1;
    for (const location of day.locations) {
      await prisma.itineraryItem.create({
        data: {
          itineraryId: itinerary.id,
          dayNumber: day.dayNumber,
          orderInDay: order++,
          placeId: location.id,
          notes: location.description ? location.description.substring(0, 100) : null,
          // Optional: Add timing estimates
          suggestedDuration: 90, // 1.5 hours default
        },
      });
    }
  }
  
  // Create mock checklist for RAG (could be real service later)
  const checklistItems = [
    { category: 'ESSENTIALS', item: 'Passport', reason: 'Required for travel' },
    { category: 'ESSENTIALS', item: 'Universal Adapter', reason: 'For charging devices' },
    { category: 'WEATHER', item: 'Sunscreen', reason: 'Sunny weather expected' },
    { category: 'ACTIVITY', item: 'Comfortable Shoes', reason: 'Walking tours' }
  ];
  
  for (const item of checklistItems) {
    await prisma.checklistItem.create({
      data: {
        itineraryId: itinerary.id,
        category: item.category as any,
        item: item.item,
        reason: item.reason,
      }
    });
  }
  
  return itinerary;
}
