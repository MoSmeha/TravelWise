import { LocationClassification } from '@prisma/client';
import { BudgetLevel, TravelStyle } from '../utils/enum-mappers';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import * as googlePlacesService from './google-places.service';
import { haversineDistance } from '../utils/geo.utils';
import { getOpenAIClient, isOpenAIConfigured } from '../utils/openai.utils';

// Place type for itinerary locations
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
  imageUrl?: string | null;
  imageUrls?: string[];
  googlePlaceId?: string | null;
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
  id: string;
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

// calculateDistance is now imported from geo.utils.ts as haversineDistance

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
        const dist = haversineDistance(centroidLat, centroidLon, loc.latitude, loc.longitude);
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
  if (!isOpenAIConfigured()) {
    return { warnings: [], touristTraps: [], localTips: [] };
  }
  
  const openai = getOpenAIClient();
  
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
  
  // cityId is treated as the city name string (e.g., "Beirut")
  const cityName = cityId;
  
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
      id: uuidv4(),
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

  // Enrich with images if missing
  // We do this asynchronously but await it to ensure images are available for the user
  console.log('🖼️ Checking for missing images...');
  
  for (const day of days) {
    for (let i = 0; i < day.locations.length; i++) {
        const location = day.locations[i];
        
        // If image is missing and we have a googlePlaceId, fetch it
        if ((!location.imageUrl || location.imageUrl === '') && location.googlePlaceId) {
            try {
                console.log(`🖼️ Fetching image for ${location.name} (${location.googlePlaceId})...`);
                const details = await googlePlacesService.getPlaceDetails(location.googlePlaceId);
                
                if (details.data && details.data.photos && details.data.photos.length > 0) {
                    const mainPhoto = details.data.photos[0];
                    const allPhotos = details.data.photos;
                    
                    // Update in-memory object
                    location.imageUrl = mainPhoto;
                    location.imageUrls = allPhotos;
                    
                    // Update database asynchronously
                    prisma.place.update({
                        where: { id: location.id },
                        data: {
                            imageUrl: mainPhoto,
                            imageUrls: allPhotos,
                            lastEnrichedAt: new Date()
                        }
                    }).then(() => {
                        console.log(`✅ Saved images for ${location.name}`);
                    }).catch(err => {
                        console.error(`❌ Failed to save images for ${location.name}:`, err);
                    });
                }
            } catch (error) {
                console.error(`❌ Failed to fetch image for ${location.name}:`, error);
            }
        }
    }
  }
  
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
  userId: string,
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
