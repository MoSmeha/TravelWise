import { ChecklistCategory, ItineraryItemType, LocationCategory, Place, PriceLevel } from '@prisma/client';
import { BudgetLevel, TravelStyle, mapBudgetToPriceLevel } from '../utils/enum-mappers';
import { v4 as uuidv4 } from 'uuid';
import * as googlePlacesService from './google-places.service';
import * as routeOptimizer from './route-optimizer.service';
import { getOpenAIClient, isOpenAIConfigured } from '../utils/openai.utils';
import * as fs from 'fs';
import * as path from 'path';
import { itineraryProvider } from '../providers/itinerary.provider.pg';
import { IItineraryProvider } from '../provider-contract/itinerary.provider-contract';
import { mapPlaceForGenerateResponse } from '../utils/response-mappers';

// Local type extension if needed, but primarily use Prisma Place
// We use intersection to add arbitrary keys if needed (for enrichments)
type PlaceExtended = Place & { [key: string]: any };

interface GenerateItineraryParams {
  cityId: string; // Treated as city name or country ID
  numberOfDays: number;
  budgetLevel: BudgetLevel;
  travelStyles: TravelStyle[]; // Array of styles (max 3)
  budgetUSD: number;
  userId?: string;
  countryId?: string;
}

// Structured day with activities, meals, and hotel
interface StructuredDay {
  dayNumber: number;
  hotel: PlaceExtended | null;
  meals: {
    breakfast: PlaceExtended | null;
    lunch: PlaceExtended | null;
    dinner: PlaceExtended | null;
  };
  activities: {
    anchor: PlaceExtended | null;    // 3-4 hours, main attraction
    medium: PlaceExtended | null;    // 2 hours, secondary
    light: PlaceExtended | null;     // 30-60 min, quick stop
    evening: PlaceExtended | null;   // Optional night activity
  };
  theme?: string;
}

interface ItineraryDayResult {
  id: string;
  dayNumber: number;
  description: string;
  routeDescription: string;
  locations: PlaceExtended[];
  hotel: PlaceExtended | null;
  meals: {
    breakfast: PlaceExtended | null;
    lunch: PlaceExtended | null;
    dinner: PlaceExtended | null;
  };
  theme?: string;
}

export interface ItineraryResult {
  itinerary: {
    numberOfDays: number;
    budgetUSD: number;
    budgetLevel?: BudgetLevel;
    travelStyles?: TravelStyle[];
  };
  days: ItineraryDayResult[];
  hotel: PlaceExtended | null; // Primary hotel for the trip
  totalEstimatedCostUSD: number;
  routeSummary: string;
  warnings: Array<{ title: string; description: string }>;
  touristTraps: Array<{ name: string; reason: string }>;
  localTips: string[];
}

// Activity categories mapping based on travel style
const ACTIVITY_CATEGORIES: Record<TravelStyle, LocationCategory[]> = {
  ADVENTURE: [LocationCategory.HIKING, LocationCategory.ACTIVITY, LocationCategory.BEACH, LocationCategory.PARK, LocationCategory.VIEWPOINT],
  CULTURAL: [LocationCategory.HISTORICAL_SITE, LocationCategory.MUSEUM, LocationCategory.RELIGIOUS_SITE, LocationCategory.MARKET],
  NATURE_ECO: [LocationCategory.PARK, LocationCategory.HIKING, LocationCategory.BEACH, LocationCategory.VIEWPOINT],
  BEACH_RELAXATION: [LocationCategory.BEACH, LocationCategory.CAFE, LocationCategory.VIEWPOINT, LocationCategory.PARK],
  URBAN_CITY: [LocationCategory.SHOPPING, LocationCategory.MARKET, LocationCategory.VIEWPOINT],
  FAMILY_GROUP: [LocationCategory.MUSEUM, LocationCategory.PARK, LocationCategory.ACTIVITY, LocationCategory.SHOPPING],
};

// Meal categories
const MEAL_CATEGORIES: LocationCategory[] = [LocationCategory.RESTAURANT, LocationCategory.CAFE];

// Night activity categories  
const NIGHT_CATEGORIES: LocationCategory[] = [LocationCategory.BAR, LocationCategory.NIGHTCLUB, LocationCategory.RESTAURANT];

// Hotel categories
const HOTEL_CATEGORIES: LocationCategory[] = [LocationCategory.HOTEL, LocationCategory.ACCOMMODATION];

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
  
  // Build rich context from itinerary
  let context = `Itinerary for ${cityName}:\n\n`;
  
  days.forEach(day => {
    context += `Day ${day.dayNumber}: ${day.description}\n`;
    day.locations.forEach(loc => {
      context += `- ${loc.name} (${loc.category}): ${loc.description?.substring(0, 100) || 'No description'}\n`;
      if (loc.rating) context += `  Rating: ${loc.rating}/5 (${loc.totalRatings} reviews)\n`;
    });
    context += '\n';
  });
  
  const prompt = `You are a local travel expert for ${cityName}. 
Analyze this specific itinerary and provide targeted advice.
Do NOT provide generic tips. Address these specific locations.

${context}

Generate:
1. 2-3 specific warnings relevant to THESE locations (e.g. if visiting a specific market, warn about pickpockets there).
2. 2-3 specific tourist traps to avoid NEAR the places listed.
3. 3-5 "insider" local tips for these specific spots (e.g. "Best sunset view is from the terrace of X").

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

/**
 * Fetch places from database with proper filtering
 * Delegates to itinerary provider for database access
 */
async function fetchPlaces(
  categories: LocationCategory[],
  country: string,
  city: string | null,
  limit: number,
  excludeIds: string[] = [],
  priceLevel?: PriceLevel,
  provider: IItineraryProvider = itineraryProvider
): Promise<PlaceExtended[]> {
  const places = await provider.fetchPlaces({
    categories,
    country,
    city,
    limit,
    excludeIds,
    priceLevel,
  });
  
  return places as PlaceExtended[];
}

/**
 * Get activity categories based on travel styles
 */
function getActivityCategories(travelStyles: TravelStyle[]): LocationCategory[] {
  const categories = new Set<LocationCategory>();
  for (const style of travelStyles) {
    const styleCats = ACTIVITY_CATEGORIES[style] || [];
    styleCats.forEach(cat => categories.add(cat));
  }
  return Array.from(categories);
}

/**
 * Assign hotel for the trip - minimize switching
 * Only assign different hotels if places span very different regions
 */
function assignHotels(
  hotels: PlaceExtended[],
  structuredDays: StructuredDay[]
): PlaceExtended | null {
  if (hotels.length === 0) return null;
  
  // For MVP, use single hotel for entire trip
  // Pick the hotel closest to the centroid of all activities
  const allActivities = structuredDays.flatMap(d => [
    d.activities.anchor,
    d.activities.medium,
    d.activities.light,
  ].filter(Boolean) as PlaceExtended[]);
  
  if (allActivities.length === 0) return hotels[0];
  
  // Calculate centroid
  const centroid = {
    lat: allActivities.reduce((sum, p) => sum + p.latitude, 0) / allActivities.length,
    lng: allActivities.reduce((sum, p) => sum + p.longitude, 0) / allActivities.length,
  };
  
  // Find closest hotel to centroid
  let closestHotel = hotels[0];
  let minDist = Infinity;
  
  for (const hotel of hotels) {
    const dist = Math.sqrt(
      Math.pow(hotel.latitude - centroid.lat, 2) + 
      Math.pow(hotel.longitude - centroid.lng, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      closestHotel = hotel;
    }
  }
  
  return closestHotel;
}

export async function generateItinerary(params: GenerateItineraryParams): Promise<ItineraryResult> {
  const { cityId, numberOfDays, budgetLevel, travelStyles, budgetUSD } = params;
  
  // Parse cityId - could be city name or country. Default to Lebanon for MVP
  const country = 'Lebanon';
  const cityName = cityId; // Treat as city filter hint
  
  console.log(`[ITINERARY] Generating structured itinerary: ${cityName}, ${numberOfDays} days, styles: ${travelStyles.join(', ')}...`);
  
  // Calculate how many places we need
  const activitiesPerDay = 4; // anchor + medium + light + optional evening
  const mealsPerDay = 3;      // breakfast + lunch + dinner
  const totalActivitiesNeeded = numberOfDays * activitiesPerDay;
  const totalMealsNeeded = numberOfDays * mealsPerDay;
  
  // Get activity categories based on travel styles
  const activityCategories = getActivityCategories(travelStyles);
  
  // Log if no categories match
  if (activityCategories.length === 0) {
    const logPath = path.join(__dirname, '../../logs/missing-data.log');
    const logEntry = `[${new Date().toISOString()}] No categories for styles: ${travelStyles.join(', ')}\n`;
    fs.appendFileSync(logPath, logEntry);
    console.warn(`[WARN] No categories match travel styles: ${travelStyles.join(', ')}`);
  }
  
  // Fetch activities with proper filtering (limited to what we need + buffer)
  const usedIds: string[] = [];
  
  // Map budget level to price level for filtering
  const priceLevel = mapBudgetToPriceLevel(budgetLevel);
  console.log(`[FETCH] Fetching ${totalActivitiesNeeded} activities for ${numberOfDays} days, budget: ${budgetLevel} -> ${priceLevel}...`);
  
  const activities = await fetchPlaces(
    activityCategories.length > 0 ? activityCategories : [LocationCategory.OTHER],
    country,
    cityName,
    Math.ceil(totalActivitiesNeeded * 1.5), // 50% buffer for variety
    [],
    priceLevel
  );
  usedIds.push(...activities.map(a => a.id));
  
  console.log(`[FETCH] Fetching ${totalMealsNeeded} meal spots...`);
  const restaurants = await fetchPlaces(
    MEAL_CATEGORIES,
    country,
    cityName,
    Math.ceil(totalMealsNeeded * 1.2),
    usedIds,
    priceLevel
  );
  usedIds.push(...restaurants.map(r => r.id));
  
  console.log(`[FETCH] Fetching evening options...`);
  const nightSpots = await fetchPlaces(
    NIGHT_CATEGORIES,
    country,
    cityName,
    numberOfDays, // 1 per day max
    usedIds,
    priceLevel
  );
  usedIds.push(...nightSpots.map(n => n.id));
  
  console.log(`[FETCH] Fetching hotels...`);
  const hotels = await fetchPlaces(
    HOTEL_CATEGORIES,
    country,
    cityName,
    3, // Fetch a few options
    usedIds
  );
  
  console.log(`[STATS] Fetched: ${activities.length} activities, ${restaurants.length} restaurants, ${nightSpots.length} night spots, ${hotels.length} hotels`);
  
  // Build structured days
  const structuredDays: StructuredDay[] = [];
  let activityIdx = 0;
  let restaurantIdx = 0;
  let nightIdx = 0;
  
  for (let dayNum = 1; dayNum <= numberOfDays; dayNum++) {
    // Get activities for this day, optimized by route
    const dayActivities = activities.slice(activityIdx, activityIdx + 3);
    activityIdx += 3;
    
    // Get meals for this day
    const dayMeals = restaurants.slice(restaurantIdx, restaurantIdx + 3);
    restaurantIdx += 3;
    
    // Optional night activity
    const nightActivity = nightSpots[nightIdx] || null;
    if (nightActivity) nightIdx++;
    
    // Categorize activities by expected duration (using category as heuristic)
    // Anchor: Museums, Historical Sites, Hiking (3-4 hours)
    // Medium: Parks, Markets, Beaches (2 hours)
    // Light: Viewpoints, Cafes, Shopping (30-60 min)
    const anchorCats: string[] = ['MUSEUM', 'HISTORICAL_SITE', 'HIKING'];
    const lightCats: string[] = ['VIEWPOINT', 'SHOPPING'];
    
    let anchor = dayActivities.find(a => anchorCats.includes(a.category as string)) || dayActivities[0] || null;
    let light = dayActivities.find(a => lightCats.includes(a.category as string) && a !== anchor) || null;
    let medium = dayActivities.find(a => a !== anchor && a !== light) || null;
    
    // If we didn't find distinct activities, just use what we have
    if (!anchor && dayActivities.length > 0) anchor = dayActivities[0];
    if (!medium && dayActivities.length > 1) medium = dayActivities[1];
    if (!light && dayActivities.length > 2) light = dayActivities[2];
    
    structuredDays.push({
      dayNumber: dayNum,
      hotel: null, // Will be assigned later
      meals: {
        breakfast: dayMeals[0] || null, // Usually at hotel or cafe
        lunch: dayMeals[1] || null,
        dinner: dayMeals[2] || null,
      },
      activities: {
        anchor,
        medium,
        light,
        evening: nightActivity,
      },
      theme: anchor?.category?.toString() || 'Mixed',
    });
  }
  
  // Assign hotel(s)
  const primaryHotel = assignHotels(hotels, structuredDays);
  structuredDays.forEach(d => d.hotel = primaryHotel);
  
  // Use route optimizer to order activities within each day
  const startPoint = { lat: 33.8209, lng: 35.4913 }; // Beirut Airport default
  
  const days: ItineraryDayResult[] = structuredDays.map((sd) => {
    // Collect all places for the day for route optimization
    // Note: hotel is NOT included here - it's stored separately in day.hotel
    const dayPlaces = [
      sd.activities.anchor,
      sd.meals.breakfast,
      sd.activities.medium,
      sd.meals.lunch,
      sd.activities.light,
      sd.meals.dinner,
      sd.activities.evening,
    ].filter((p): p is PlaceExtended => p !== null);
    
    // Optimize route within the day
    const placesWithCoords = dayPlaces.map(p => ({
      id: p.id,
      name: p.name,
      latitude: p.latitude,
      longitude: p.longitude,
      category: p.category,
      suggestedDuration: p.category === LocationCategory.MUSEUM || p.category === LocationCategory.HIKING ? 180 : 90,
    }));
    
    const orderedPlaces = routeOptimizer.nearestNeighborRoute(placesWithCoords, startPoint);
    const orderedFullPlaces = orderedPlaces
      .map(p => dayPlaces.find(dp => dp.id === p.id))
      .filter((p): p is PlaceExtended => p !== undefined);
    
    const locationNames = orderedFullPlaces.map(p => p.name).join(' → ');
    
    return {
      id: uuidv4(),
      dayNumber: sd.dayNumber,
      description: `Day ${sd.dayNumber}: ${sd.theme || 'Exploring'}`,
      routeDescription: locationNames,
      locations: orderedFullPlaces,
      hotel: sd.hotel,
      meals: sd.meals,
      theme: sd.theme,
    };
  });
  
  // Enrich with images if missing (only for places that need it)
  console.log('[IMAGES] Checking for missing images...');
  for (const day of days) {
    for (const location of day.locations) {
      if ((!location.imageUrl || location.imageUrl === '') && location.googlePlaceId) {
        try {
          console.log(`[IMAGES] Fetching image for ${location.name} (${location.googlePlaceId})...`);
          const details = await googlePlacesService.getPlaceDetails(location.googlePlaceId);
          
          if (details.data && details.data.photos && details.data.photos.length > 0) {
            const mainPhoto = details.data.photos[0];
            const allPhotos = details.data.photos;
            
            location.imageUrl = mainPhoto;
            location.imageUrls = allPhotos;
            
            // Update database asynchronously using provider
            itineraryProvider.updatePlaceEnrichment(location.id, {
              imageUrl: mainPhoto,
              imageUrls: allPhotos,
              lastEnrichedAt: new Date()
            }).catch((err: Error) => console.error(`[ERROR] Failed to save images for ${location.name}:`, err));
          }
        } catch (error) {
          console.error(`[ERROR] Failed to fetch image for ${location.name}:`, error);
        }
      }
    }
  }
  
  // Calculate costs
  const totalEstimatedCostUSD = days.reduce((sum, day) => {
    return sum + day.locations.reduce((dSum, loc) => dSum + (loc.costMinUSD || 20), 0);
  }, 0);
  
  // Generate AI polish
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
  }
  
  const totalLocations = days.reduce((sum, d) => sum + d.locations.length, 0);
  console.log(`[SUCCESS] Generated itinerary: ${days.length} days, ${totalLocations} total locations (avg ${(totalLocations / days.length).toFixed(1)}/day)`);
  
  return {
    itinerary: {
      numberOfDays,
      budgetUSD,
      budgetLevel,
      travelStyles,
    },
    days,
    hotel: primaryHotel,
    totalEstimatedCostUSD,
    routeSummary: `${numberOfDays} days in ${days[0]?.locations[0]?.city || cityName}`,
    warnings,
    touristTraps,
    localTips,
  };
}

// Function to save the generated itinerary to the database
// Uses itinerary provider for database operations
export async function saveItineraryToDb(
  userId: string,
  input: any,
  generated: ItineraryResult,
  countryName: string,
  airportCode: string,
  provider: IItineraryProvider = itineraryProvider
) {
  // Create UserItinerary
  const itinerary = await provider.createItinerary({
    userId,
    country: countryName,
    airportCode,
    numberOfDays: input.numberOfDays,
    budgetUSD: input.budgetUSD,
    travelStyles: input.travelStyles || generated.itinerary.travelStyles || [],
    flightDate: input.flightDate ? new Date(input.flightDate) : null,
    totalEstimatedCostUSD: generated.totalEstimatedCostUSD,
    routeSummary: generated.routeSummary,
  });
  
  // Create ItineraryDays and ItineraryItems
  for (const day of generated.days) {
    // Create ItineraryDay with theme and hotel
    const itineraryDay = await provider.createItineraryDay({
      itineraryId: itinerary.id,
      dayNumber: day.dayNumber,
      theme: day.theme || 'Mixed',
      description: day.description,
      hotelId: day.hotel?.id || null,
    });
    
    let order = 1;
    
    // Add activity locations
    for (const location of day.locations) {
      await provider.createItineraryItem({
        dayId: itineraryDay.id,
        orderInDay: order++,
        placeId: location.id,
        itemType: ItineraryItemType.ACTIVITY,
        notes: location.description ? location.description.substring(0, 100) : null,
        suggestedDuration: 90,
      });
    }
    
    // Add meal items
    if (day.meals) {
      if (day.meals.breakfast) {
        await provider.createItineraryItem({
          dayId: itineraryDay.id,
          orderInDay: order++,
          placeId: day.meals.breakfast.id,
          itemType: ItineraryItemType.BREAKFAST,
          suggestedDuration: 45,
        });
      }
      if (day.meals.lunch) {
        await provider.createItineraryItem({
          dayId: itineraryDay.id,
          orderInDay: order++,
          placeId: day.meals.lunch.id,
          itemType: ItineraryItemType.LUNCH,
          suggestedDuration: 60,
        });
      }
      if (day.meals.dinner) {
        await provider.createItineraryItem({
          dayId: itineraryDay.id,
          orderInDay: order++,
          placeId: day.meals.dinner.id,
          itemType: ItineraryItemType.DINNER,
          suggestedDuration: 90,
        });
      }
    }
  }
  
  // Create mock checklist for RAG
  const checklistItems: Array<{ category: ChecklistCategory; item: string; reason: string }> = [
    { category: ChecklistCategory.ESSENTIALS, item: 'Passport', reason: 'Required for travel' },
    { category: ChecklistCategory.ESSENTIALS, item: 'Universal Adapter', reason: 'For charging devices' },
    { category: ChecklistCategory.WEATHER, item: 'Sunscreen', reason: 'Sunny weather expected' },
    { category: ChecklistCategory.ACTIVITY, item: 'Comfortable Shoes', reason: 'Walking tours' }
  ];
  
  for (const item of checklistItems) {
    await provider.createChecklistItem({
      itineraryId: itinerary.id,
      category: item.category,
      item: item.item,
      reason: item.reason,
    });
  }
  
  return itinerary;
}


/**
 * Enrich locations with Google Places data
 */
export interface DayLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  [key: string]: any;
}

export interface DayWithLocations {
  locations: DayLocation[];
  [key: string]: any;
}

export async function enrichLocations(days: DayWithLocations[]) {
  console.log(`[IMAGES] Enriching ${days.reduce((sum: number, d) => sum + d.locations.length, 0)} locations with Google Places data...`);
  
  for (const day of days) {
    for (const location of day.locations) {
      try {
        // Check if we already have detailed data OR if we checked recently (to avoid retrying empty fields)
        const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
        const lastChecked = location.lastEnrichedAt ? new Date(location.lastEnrichedAt).getTime() : 0;
        const isRecentlyChecked = (Date.now() - lastChecked) < THIRTY_DAYS;

        if ((location.openingHours && (location.imageUrl || (location.imageUrls && location.imageUrls.length > 0))) || isRecentlyChecked) {
          console.log(`[SKIP] Skipping enrichment for "${location.name}" - already data or checked recently`);
          continue;
        }

        const googleData = await googlePlacesService.enrichPlaceWithGoogleData(
          location.name,
          location.latitude,
          location.longitude
        );
        
        if (googleData.data) {
          // Check if another place already has this googlePlaceId to avoid unique constraint violations
          const existingPlace = await itineraryProvider.findPlaceByGoogleId(googleData.data.googlePlaceId);

          // Only update googlePlaceId if it doesn't exist or belongs to this place
          const shouldUpdateId = !existingPlace || existingPlace.id === location.id;

          await itineraryProvider.updatePlaceEnrichment(location.id, {
            ...(shouldUpdateId ? { googlePlaceId: googleData.data.googlePlaceId } : {}),
            rating: googleData.data.rating,
            totalRatings: googleData.data.totalRatings,
            topReviews: googleData.data.topReviews as any,
            imageUrls: googleData.data.photos,
            imageUrl: googleData.data.photos[0] || undefined,
            openingHours: googleData.data.openingHours as any,
            lastEnrichedAt: new Date(),
          });
          
          // Attach to location object for embedding generation and response
          location.rating = googleData.data.rating;
          location.totalRatings = googleData.data.totalRatings;
          location.topReviews = googleData.data.topReviews;
          location.openingHours = googleData.data.openingHours;
          location.imageUrls = googleData.data.photos;
          location.imageUrl = googleData.data.photos[0];
        }
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`[INFO] Place "${location.name}" already has Google Place ID attached.`);
          continue;
        }
        console.warn(`[WARN] Failed to enrich "${location.name}":`, error.message);
      }
    }
  }
}

/**
 * Build the itinerary response object
 */
export function buildItineraryResponse(
  itineraryId: string, 
  input: any, 
  result: ItineraryResult,
  countryConfig: any,
  airportConfig: any
) {
  const totalCost = result.totalEstimatedCostUSD || input.budgetUSD;
  
  const daysWithIds = result.days.map((d: any) => ({
    id: `day-${d.dayNumber}`,
    dayNumber: d.dayNumber,
    description: d.description,
    theme: d.theme,
    locations: d.locations.map((loc: any, idx: number) => mapPlaceForGenerateResponse(loc, idx, d.dayNumber)),
    meals: d.meals ? {
      breakfast: mapPlaceForGenerateResponse(d.meals.breakfast, 0, d.dayNumber),
      lunch: mapPlaceForGenerateResponse(d.meals.lunch, 1, d.dayNumber),
      dinner: mapPlaceForGenerateResponse(d.meals.dinner, 2, d.dayNumber),
    } : null,
    hotel: d.hotel ? mapPlaceForGenerateResponse(d.hotel, 0, d.dayNumber) : null,
    routeDescription: d.routeDescription,
  }));
  
  // Map primary hotel
  const hotel = result.hotel ? {
    id: result.hotel.id,
    name: result.hotel.name,
    category: result.hotel.category,
    latitude: result.hotel.latitude,
    longitude: result.hotel.longitude,
    rating: result.hotel.rating,
    imageUrl: result.hotel.imageUrl,
    address: result.hotel.address,
  } : null;
  
  return {
    source: 'DATABASE',
    itinerary: {
      id: itineraryId,
      numberOfDays: input.numberOfDays,
      budgetUSD: input.budgetUSD,
      totalEstimatedCostUSD: totalCost,
      budgetBreakdown: {
        food: Math.round(totalCost * 0.3),
        activities: Math.round(totalCost * 0.2),
        transport: Math.round(totalCost * 0.1),
        accommodation: Math.round(totalCost * 0.4),
      },
    },
    days: daysWithIds,
    hotel,
    airport: {
      name: airportConfig.name,
      code: airportConfig.code,
      latitude: airportConfig.latitude,
      longitude: airportConfig.longitude,
    },
    country: {
      id: countryConfig.key,
      name: countryConfig.name,
      code: countryConfig.code,
      currency: countryConfig.currency,
    },
    warnings: result.warnings.map((w: any, idx: number) => ({ id: `warn-${idx}`, ...w })),
    touristTraps: result.touristTraps.map((t: any, idx: number) => ({ id: `trap-${idx}`, ...t })),
    localTips: result.localTips,
    routeSummary: result.routeSummary || '',
  };
}

/**
 * Build response for getItineraryDetails endpoint
 * Uses response mappers for consistent formatting
 */
export function buildItineraryDetailsResponse(
  itinerary: any,
  _countryConfig: any,  // kept for API consistency with buildItineraryResponse
  airportConfig: any
) {
  // Import mappers inline to avoid circular dependency
  const { mapPlaceToLocation, mapPlaceToMeal, mapPlaceToHotel, mapAirportToResponse } = require('../utils/response-mappers');
  
  // Build response from ItineraryDay structure
  const days = itinerary.days.map((day: any) => {
    const activities = day.items.filter((i: any) => i.itemType === 'ACTIVITY');
    const meals = {
      breakfast: day.items.find((i: any) => i.itemType === 'BREAKFAST')?.place || null,
      lunch: day.items.find((i: any) => i.itemType === 'LUNCH')?.place || null,
      dinner: day.items.find((i: any) => i.itemType === 'DINNER')?.place || null,
    };

    const locations = activities.map((item: any) => 
      mapPlaceToLocation(item.place, item.notes)
    );

    return {
      id: day.id,
      dayNumber: day.dayNumber,
      theme: day.theme,
      description: day.description || `Day ${day.dayNumber}`,
      locations,
      meals: {
        breakfast: mapPlaceToMeal(meals.breakfast),
        lunch: mapPlaceToMeal(meals.lunch),
        dinner: mapPlaceToMeal(meals.dinner),
      },
      hotel: mapPlaceToHotel(day.hotel),
    };
  });

  return {
    source: 'DATABASE',
    itinerary: {
      id: itinerary.id,
      numberOfDays: itinerary.numberOfDays,
      budgetUSD: itinerary.budgetUSD,
      totalEstimatedCostUSD: itinerary.totalEstimatedCostUSD,
      travelStyles: itinerary.travelStyles,
    },
    days,
    airport: mapAirportToResponse(airportConfig, {
      country: itinerary.country,
      code: itinerary.airportCode,
    }),
    warnings: [],
    touristTraps: [],
    localTips: [],
    routeSummary: itinerary.routeSummary,
  };
}
