import { ChecklistCategory, ItineraryItemType, LocationCategory, Place, PriceLevel, LocationClassification } from '../generated/prisma/client.js';
import { BudgetLevel, TravelStyle, mapBudgetToPriceLevel } from '../utils/enum-mappers.js';
import { v4 as uuidv4 } from 'uuid';
import { searchNearbyHotels, enrichPlaceWithGoogleData, searchPlacesByText } from './google-places.service.js';
import { nearestNeighborRoute, kMeansClustering, orderClustersByProximity } from './route-optimizer.service.js';
import { getOpenAIClient, isOpenAIConfigured } from '../utils/openai.utils.js';
import { itineraryProvider } from '../providers/itinerary.provider.pg.js';
import { IItineraryProvider } from '../provider-contract/itinerary.provider-contract.js';
import { mapPlaceForGenerateResponse, mapPlaceToLocation, mapPlaceToMeal, mapPlaceToHotel, mapAirportToResponse } from '../utils/response-mappers.js';
import { calculateCentroid, haversineDistance } from '../utils/geo.utils.js';

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

// Hotel categories
const HOTEL_CATEGORIES: LocationCategory[] = [LocationCategory.HOTEL, LocationCategory.ACCOMMODATION];

interface ItineraryDayResult {
  id: string;
  dayNumber: number;
  description: string;
  routeDescription: string;
  locations: PlaceExtended[];
  hotel: PlaceExtended | null;           // End-of-day hotel
  startingHotel?: PlaceExtended | null;  // For Day 1 only
  meals: {
    breakfast: PlaceExtended | null;
    lunch: PlaceExtended | null;
    dinner: PlaceExtended | null;
  };
  theme?: string;
  isLastDay?: boolean;
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
  checklist: Array<{ category: string; item: string; reason: string }>;
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

// Generate AI Polish: warnings, tourist traps, and local tips
async function generateAIPolish(
  days: ItineraryDayResult[],
  cityName: string
): Promise<{
  warnings: Array<{ title: string; description: string }>;
  touristTraps: Array<{ name: string; reason: string }>;
  localTips: string[];
  checklist: Array<{ category: string; item: string; reason: string }>;
}> {
  if (!isOpenAIConfigured()) {
    return { warnings: [], touristTraps: [], localTips: [], checklist: [] };
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
4. 5-7 packing checklist items customized for this specific trip (weather, activities, culture).
   Categories must be one of: ESSENTIALS, WEATHER, ACTIVITY, CLOTHING, TOILETRIES, TEC, HEALTH, MISC.

Format as JSON:
{
  "warnings": [{"title": "...", "description": "..."}],
  "touristTraps": [{"name": "...", "reason": "..."}],
  "localTips": ["...", "..."],
  "checklist": [{"category": "...", "item": "...", "reason": "..."}]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5.2',
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
        checklist: parsed.checklist || [],
      };
    }
  } catch (error) {
    console.error('AI Polish generation failed:', error);
  }
  
  return { warnings: [], touristTraps: [], localTips: [], checklist: [] };
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
 * Find a hotel near a specific location
 * First checks DB hotels, then falls back to Google Places API
 */
async function findHotelNearLocation(
  lat: number,
  lng: number,
  dbHotels: PlaceExtended[],
  country: string,
  radiusKm: number = 10
): Promise<PlaceExtended | null> {
  // Calculate distance to each DB hotel
  const hotelsWithDistance = dbHotels.map(hotel => ({
    hotel,
    distance: Math.sqrt(
      Math.pow(hotel.latitude - lat, 2) + 
      Math.pow(hotel.longitude - lng, 2)
    ) * 111 // Rough conversion to km
  }));
  
  // Filter hotels within radius and sort by distance
  const nearbyDbHotels = hotelsWithDistance
    .filter(h => h.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
  
  if (nearbyDbHotels.length > 0) {
    console.log(`[HOTEL] Found DB hotel "${nearbyDbHotels[0].hotel.name}" ${nearbyDbHotels[0].distance.toFixed(1)}km from location`);
    return nearbyDbHotels[0].hotel;
  }
  
  // Fallback to Google Places API
  console.log(`[HOTEL] No DB hotels within ${radiusKm}km of (${lat.toFixed(4)}, ${lng.toFixed(4)}), searching Google Places...`);
  
  const googleResult = await searchNearbyHotels(lat, lng, radiusKm * 1000, 4.0);
  
  if (googleResult.hotels.length > 0) {
    const bestHotel = googleResult.hotels[0];
    console.log(`[HOTEL] Found Google hotel "${bestHotel.name}" (${bestHotel.rating}★)`);
    
    // Convert to PlaceExtended format
    const externalHotel: PlaceExtended = {
      id: `external-${bestHotel.googlePlaceId}`,
      name: bestHotel.name,
      classification: 'MUST_SEE' as any,
      category: 'HOTEL' as any,
      description: `${bestHotel.rating}★ hotel with ${bestHotel.totalRatings} reviews`,
      sources: ['google_places'],
      sourceUrls: [],
      popularity: bestHotel.totalRatings,
      googlePlaceId: bestHotel.googlePlaceId,
      rating: bestHotel.rating,
      totalRatings: bestHotel.totalRatings,
      priceLevel: bestHotel.priceLevel as any,
      openingHours: null,
      topReviews: null,
      latitude: bestHotel.latitude,
      longitude: bestHotel.longitude,
      address: bestHotel.formattedAddress,
      city: country,
      country,
      costMinUSD: null,
      costMaxUSD: null,
      activityTypes: ['accommodation'],
      bestTimeToVisit: null,
      localTip: null,
      scamWarning: null,
      imageUrl: bestHotel.photos[0] || null,
      imageUrls: bestHotel.photos,
      sourceReviews: null,
      lastEnrichedAt: new Date(),
      lastValidatedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      // External hotel properties
      websiteUrl: bestHotel.websiteUrl,
      bookingUrl: bestHotel.bookingUrl,
      isExternalHotel: true,
    };
    
    return externalHotel;
  }
  
  console.log(`[HOTEL] No hotels found near (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
  return null;
}



// Helper to check if data is limited
function checkLimitedData(fetched: number, requested: number, context: string) {
  if (fetched < requested) {
    console.warn(`[LIMITED DATA] ${context}: Requested ${requested}, but only found ${fetched}. Itinerary quality may degrade.`);
  }
}

export async function generateItinerary(params: GenerateItineraryParams): Promise<ItineraryResult> {
  const { cityId, numberOfDays, budgetLevel, travelStyles, budgetUSD } = params;
  
  // Parse cityId - could be city name or country.
  // IMPROVEMENT: Flexible country support, defaulting to input but robust fallback
  let country = 'Lebanon'; 
  let cityName = cityId;

  // Basic heuristic: if cityId looks like a country, use it as country
  const commonCountries = ['Lebanon', 'France', 'Italy', 'Spain', 'Germany', 'Japan', 'UAE', 'United Arab Emirates'];
  if (commonCountries.some(c => c.toLowerCase() === cityId.toLowerCase())) {
    country = cityId;
    cityName = ''; // Wide search
  }
  
  console.log(`[ITINERARY] Generating clustered itinerary: ${cityName || country}, ${numberOfDays} days, styles: ${travelStyles.join(', ')}...`);
  
  // 1. Determine "Personality" of the trip
  const activityCategories = getActivityCategories(travelStyles);
  if (activityCategories.length === 0) {
     console.warn(`[WARN] No categories match travel styles: ${travelStyles.join(', ')}. Defaulting to general interest.`);
     activityCategories.push(LocationCategory.HISTORICAL_SITE, LocationCategory.VIEWPOINT, LocationCategory.ACTIVITY);
  }

  // 2. Fetch Activity Pool (Geometry-First: Get a BIG pool first, then cluster)
  // We need enough activities to form clusters. 
  // Target: 4 per day, plus 50% buffer.
  const activitiesPerDay = 4;
  const targetPoolSize = Math.ceil(numberOfDays * activitiesPerDay * 2.0); // Double buffer for better clustering
  const priceLevel = mapBudgetToPriceLevel(budgetLevel);
  
  console.log(`[FETCH] Fetching up to ${targetPoolSize} candidate activities (Strict Categories: ${activityCategories.join(', ')})...`);
  
  const activityPool = await fetchPlaces(
    activityCategories,
    country,
    cityName || null, 
    targetPoolSize,
    [],
    undefined // Ignore price for activities (often free or fixed)
  );

  checkLimitedData(activityPool.length, targetPoolSize, 'Activity Pool');

  // AUGMENTATION: If pool is too small, use Google Places to find and save new places
  // This fulfills the "self-healing" requirement.
  if (activityPool.length < targetPoolSize) {
     const missingCount = targetPoolSize - activityPool.length;
     console.log(`[AUGMENT] Pool too small (${activityPool.length} < ${targetPoolSize}). Attempting to fetch ${missingCount} new places from Google...`);
     
     // Determine which categories are under-represented
     // For simplicity, cycle through all requested categories
     
     for (const cat of activityCategories) {
         // Create a natural language query
         // e.g. "Best Hiking spots in Lebanon" or "Top Museums in Beirut"
         const query = `Best ${cat.replace('_', ' ').toLowerCase()} in ${cityName || country}`;
         console.log(`[AUGMENT] Searching: "${query}"`);
         
         const { places } = await searchPlacesByText(query, 4.0);
         
         for (const gp of places) {
             // Avoid adding if already in pool
             if (activityPool.some(p => p.googlePlaceId === gp.googlePlaceId)) continue;
             
             // Check if already in DB (to avoid creating duplicates if excluded)
             const existing = await itineraryProvider.findPlaceByGoogleId(gp.googlePlaceId);
             if (existing) {
                 // It exists but wasn't picked (maybe low rating or excluded). Skip for now.
                 continue;
             }

             // Save to DB!
             // Map Google result to PlaceExtended
             const newPlace = await itineraryProvider.createPlace({
                 googlePlaceId: gp.googlePlaceId,
                 name: gp.name,
                 latitude: gp.latitude,
                 longitude: gp.longitude,
                 country: country,
                 city: cityName || country,
                 address: gp.formattedAddress,
                 category: cat,
                 description: `${gp.rating}★ ${cat.replace('_', ' ')} found via Google Search`,
                 rating: gp.rating,
                 totalRatings: gp.totalRatings,
                 priceLevel: gp.priceLevel !== null ? (gp.priceLevel >= 3 ? PriceLevel.EXPENSIVE : gp.priceLevel >= 2 ? PriceLevel.MODERATE : PriceLevel.INEXPENSIVE) : null,
                 imageUrl: gp.photos[0] || null,
                 imageUrls: gp.photos,
                 websiteUrl: gp.websiteUrl,
                 classification: LocationClassification.MUST_SEE // Assume top Google results are must-see
             });
             
             // Add to current pool as a partial PlaceExtended (enough for usage)
             activityPool.push({
                 id: newPlace.id,
                 name: gp.name,
                 latitude: gp.latitude,
                 longitude: gp.longitude,
                 category: cat,
                 googlePlaceId: gp.googlePlaceId,
                 rating: gp.rating,
                 priceLevel: gp.priceLevel !== null ? (gp.priceLevel >= 3 ? PriceLevel.EXPENSIVE : gp.priceLevel >= 2 ? PriceLevel.MODERATE : PriceLevel.INEXPENSIVE) : null,
                 costMinUSD: 20, // Default assumption
                 createdAt: new Date(),
                 usageCount: 0,
                 // Double cast to bypass overlap check (we are mocking a DB object)
             } as unknown as PlaceExtended);
         }
         
         if (activityPool.length >= targetPoolSize) break;
     }
  }

  // 3. Cluster Activities into Days (K-Means)
  // We convert to the simpler Coordinate interface for the clustering algo
  const placesForClustering = activityPool.map(p => ({
    id: p.id,
    name: p.name,
    latitude: p.latitude,
    longitude: p.longitude,
    category: p.category,
    suggestedDuration: 90 // Default
  }));

  // If we have extremely limited data (less than days), we just have 1 cluster
  let clusters = activityPool.length > 0 
    ? kMeansClustering(placesForClustering, Math.min(numberOfDays, activityPool.length))
    : [];

  // FIX: Order clusters geographically starting from Airport/Beirut
  const startCoords = { lat: 33.8209, lng: 35.4913 }; 
  clusters = orderClustersByProximity(clusters, startCoords);

  // FIX: Balance Clusters (Steal from rich, give to poor)
  const MIN_PER_DAY = 2;
  const MAX_ATTEMPTS = 10;
  let attempts = 0;
  let rebalanced = true;

  while(rebalanced && attempts < MAX_ATTEMPTS) {
      rebalanced = false;
      attempts++;
      
      let minLen = Infinity, maxLen = -Infinity;
      let minIdx = -1, maxIdx = -1;

      clusters.forEach((c, idx) => {
          if (c.length < minLen) { minLen = c.length; minIdx = idx; }
          if (c.length > maxLen) { maxLen = c.length; maxIdx = idx; }
      });

      if (minIdx !== -1 && maxIdx !== -1 && minLen < MIN_PER_DAY && maxLen > MIN_PER_DAY + 1) {
           const receiverCentroid = clusters[minIdx].length > 0 ? calculateCentroid(clusters[minIdx]) : startCoords;
           
           let bestTransferIdx = -1;
           let bestTransferDist = Infinity;

           clusters[maxIdx].forEach((p, pIdx) => {
               const d = haversineDistance(p.latitude, p.longitude, receiverCentroid.lat, receiverCentroid.lng);
               if (d < bestTransferDist) {
                   bestTransferDist = d;
                   bestTransferIdx = pIdx;
               }
           });

           if (bestTransferIdx !== -1) {
               const item = clusters[maxIdx].splice(bestTransferIdx, 1)[0];
               clusters[minIdx].push(item);
               rebalanced = true; 
           }
      }
  }

  // 4. Assign Clusters to Days (and fill gaps if needed)
  const days: ItineraryDayResult[] = [];
  const globalUsedIds = new Set<string>();

  // Helper to get actual PlaceExtended objects from simplified cluster points
  const getFullPlaces = (simplePlaces: any[]) => {
    return simplePlaces.map(sp => activityPool.find(ap => ap.id === sp.id)).filter(p => p !== undefined) as PlaceExtended[];
  };

  // 5. Select Base Hotel (Geometry-First: Center of all activities)
  // Instead of hotel hopping, we find ONE good base location.
  // Ideally, this is near the centroid of the largest cluster or the overall centroid.
  console.log('[HOTEL] Finding optimal base hotel...');
  
  let baseHotel: PlaceExtended | null = null;
  const overallCentroid = activityPool.length > 0 
    ? calculateCentroid(activityPool) 
    : { lat: 33.8938, lng: 35.5018 }; // Default to Beirut if empty

  // Fetch hotels near the centroid
  const candidateHotels = await findHotelNearLocation(
    overallCentroid.lat,
    overallCentroid.lng,
    await fetchPlaces(HOTEL_CATEGORIES, country, cityName || null, 20, []), // Fetch broad hotel list first
    country,
    15 // 15km Radius
  );

  baseHotel = candidateHotels; // This function returns one hotel or null
  
  // If no hotel found near centroid (e.g. centroid is in the mountains), try nearest city center
  if (!baseHotel && activityPool.length > 0) {
      console.log('[HOTEL] optimizing: taking first activity location as fallback hotel anchor');
      baseHotel = await findHotelNearLocation(
          activityPool[0].latitude,
          activityPool[0].longitude,
          [], 
          country,
          20
      );
  }

  // Track previous end point for continuity
  let previousEndLocation = baseHotel 
    ? { lat: baseHotel.latitude, lng: baseHotel.longitude }
    : { lat: 33.8209, lng: 35.4913 }; // Default airport

  // 6. Build Daily Itineraries
  for (let i = 0; i < numberOfDays; i++) {
    const dayNum = i + 1;
    const isLastDay = dayNum === numberOfDays;
    
    // Get cluster for this day, or empty if we ran out
    const dayClusterSimple = clusters[i] || [];
    let dayActivities = getFullPlaces(dayClusterSimple);

    // CRITICAL FIX: Limit to max 4 activities per day to prevent exhaustion and "overkill"
    // Also ensures we don't dump 21 places in Day 1.
    const MAX_PER_DAY = 4;
    if (dayActivities.length > MAX_PER_DAY) {
      // If we have too many, sort by rating and take top 4
      dayActivities.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      dayActivities = dayActivities.slice(0, MAX_PER_DAY);
    }

    // If completely empty day (limited data), try to grab ANY unused activity from pool
    if (dayActivities.length === 0) {
        const unused = activityPool.filter(p => !globalUsedIds.has(p.id));
        if (unused.length > 0) {
            dayActivities = unused.slice(0, 3);
        }
    }

    // Mark IDs as used
    dayActivities.forEach(p => globalUsedIds.add(p.id));

    // Optimize Route for the Day (Nearest Neighbor)
    // FIX: Start from PREVIOUS DAY'S END location (or hotel/airport) to ensure flow
    // If we have a base hotel, we usually start from there. BUT if we want continuity across the country,
    // we should bias the start to be near where we left off (if staying in different places)
    // or just assume we drive from base hotel.
    // User complaint: "Day 1 ends somewhere, Day 2 starts somewhere else".
    // Since we have a BASE HOTEL, we technically start at Base Hotel every morning.
    // BUT the cluster order should make sense.
    // We already ordered clusters. Now we just route from Base Hotel.
    const dayStartPoint = baseHotel 
        ? { lat: baseHotel.latitude, lng: baseHotel.longitude }
        : previousEndLocation;
        
    const dayRouteSimple = nearestNeighborRoute(
        dayActivities.map(p => ({ ...p, suggestedDuration: 90 })), 
        dayStartPoint
    );
    
    // Re-map to full objects
    dayActivities = dayRouteSimple.map(dr => dayActivities.find(da => da.id === dr.id)!).filter(Boolean);

    // Update previousEndLocation for next day logic (if we were doing multi-hotel)
    if (dayActivities.length > 0) {
        const last = dayActivities[dayActivities.length - 1];
        previousEndLocation = { lat: last.latitude, lng: last.longitude };
    }

    // Fetch Meals near the Activities
    // Breakfast: Near Start
    // Lunch: Near Middle
    // Dinner: Near End/Hotel
    const morningLoc = dayActivities[0] || dayStartPoint;
    const midLoc = dayActivities[Math.floor(dayActivities.length / 2)] || morningLoc;
    const endLoc = dayActivities[dayActivities.length - 1] || midLoc;

    // Parallel fetch for speed
    const [breakfasts, lunches, dinners] = await Promise.all([
        fetchPlaces([LocationCategory.CAFE, LocationCategory.RESTAURANT], country, null, 5, Array.from(globalUsedIds), priceLevel).then(res => 
            res.filter(r => haversineDistance(r.latitude, r.longitude, morningLoc.latitude, morningLoc.longitude) < 5)
        ),
        fetchPlaces([LocationCategory.RESTAURANT], country, null, 5, Array.from(globalUsedIds), priceLevel).then(res => 
            res.filter(r => haversineDistance(r.latitude, r.longitude, midLoc.latitude, midLoc.longitude) < 5)
        ),
        fetchPlaces([LocationCategory.RESTAURANT, LocationCategory.BAR], country, null, 5, Array.from(globalUsedIds), priceLevel).then(res => 
            res.filter(r => haversineDistance(r.latitude, r.longitude, endLoc.latitude, endLoc.longitude) < 10)
        )
    ]);

    const breakfast = breakfasts[0] || null;
    const lunch = lunches[0] || null;
    const dinner = dinners[0] || null;

    if (breakfast) globalUsedIds.add(breakfast.id);
    if (lunch) globalUsedIds.add(lunch.id);
    if (dinner) globalUsedIds.add(dinner.id);
    
    const theme = dayActivities.length > 0 ? (dayActivities[0].category as string) : 'Relaxation';

    days.push({
      id: uuidv4(),
      dayNumber: dayNum,
      description: `Day ${dayNum}: ${theme} in ${dayActivities[0]?.city || country}`,
      routeDescription: dayActivities.map(d => d.name).join(' -> '),
      locations: dayActivities,
      hotel: baseHotel, // Same hotel every night!
      startingHotel: isLastDay ? undefined : baseHotel, // Consistent
      meals: {
        breakfast,
        lunch,
        dinner
      },
      theme,
      isLastDay
    });
  }

  // AI Polish (Warnings, Tips) - kept as is
  let warnings: Array<{ title: string; description: string }> = [];
  let touristTraps: Array<{ name: string; reason: string }> = [];
  let localTips: string[] = [];
  let checklist: Array<{ category: string; item: string; reason: string }> = [];

  
  try {
    const aiPolish = await generateAIPolish(days, cityName || country);
    warnings = aiPolish.warnings;
    touristTraps = aiPolish.touristTraps;
    localTips = aiPolish.localTips;
    checklist = aiPolish.checklist;
  } catch (error) {
    console.error('AI Polish failed (non-critical):', error);
  }

  // Cost Calculation & Budget Guard
  let totalEstimatedCostUSD = days.reduce((sum, day) => {
    return sum + day.locations.reduce((dSum, loc) => dSum + (loc.costMinUSD || 20), 0) + (budgetLevel === BudgetLevel.HIGH ? 150 : 50);
  }, 0);

  // If over budget, try to trim expensive activities
  if (budgetUSD > 0 && totalEstimatedCostUSD > budgetUSD) {
    console.log(`[BUDGET] Over budget ($${totalEstimatedCostUSD} > $${budgetUSD}). Trimming...`);
    
    // Flatten all locations with their day index
    let allLocs: {loc: PlaceExtended, dayIdx: number}[] = [];
    days.forEach((d, idx) => {
      d.locations.forEach(l => allLocs.push({loc: l, dayIdx: idx}));
    });

    // Sort by cost descending (assuming costMinUSD or default 20)
    allLocs.sort((a, b) => (b.loc.costMinUSD || 20) - (a.loc.costMinUSD || 20));

    while (totalEstimatedCostUSD > budgetUSD && allLocs.length > 0) {
       const candidate = allLocs.shift();
       if (!candidate) break;

       // Remove from specific day
       const day = days[candidate.dayIdx];
       // Only remove if day has enough activities or we're desperate
       if (day.locations.length > 2) {
         day.locations = day.locations.filter(l => l.id !== candidate.loc.id);
         totalEstimatedCostUSD -= (candidate.loc.costMinUSD || 20);
         console.log(`[BUDGET] Removed expensive item "${candidate.loc.name}" to save $${candidate.loc.costMinUSD || 20}`);
       }
    }
  }

  return {
    itinerary: {
      numberOfDays,
      budgetUSD,
      budgetLevel,
      travelStyles,
    },
    days,
    hotel: baseHotel,
    totalEstimatedCostUSD,
    routeSummary: `${numberOfDays} days in ${country}`,
    warnings,
    touristTraps,
    localTips,
    checklist,
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
    // Resolve hotel ID - save external hotels to DB first
    let hotelId: string | null = null;
    
    if (day.hotel) {
      if (day.hotel.isExternalHotel && day.hotel.googlePlaceId) {
        // External hotel from Google Places - save to database first
        const savedHotel = await provider.createExternalHotel({
          googlePlaceId: day.hotel.googlePlaceId,
          name: day.hotel.name,
          latitude: day.hotel.latitude,
          longitude: day.hotel.longitude,
          country: day.hotel.country,
          city: day.hotel.city ?? undefined,
          address: day.hotel.address ?? undefined,
          description: day.hotel.description ?? undefined,
          rating: day.hotel.rating ?? undefined,
          totalRatings: day.hotel.totalRatings ?? undefined,
          priceLevel: day.hotel.priceLevel ?? undefined,
          imageUrl: day.hotel.imageUrl ?? undefined,
          imageUrls: day.hotel.imageUrls || [],
          websiteUrl: day.hotel.websiteUrl ?? undefined,
        });
        hotelId = savedHotel.id;
      } else {
        // DB hotel - use existing ID
        hotelId = day.hotel.id;
      }
    }
    
    // Create ItineraryDay with theme and hotel
    const itineraryDay = await provider.createItineraryDay({
      itineraryId: itinerary.id,
      dayNumber: day.dayNumber,
      theme: day.theme || 'Mixed',
      description: day.description,
      hotelId,
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
  
  // Create checklist from AI generated items (or empty if none)
  const checklistItems = generated.checklist || [];

  
  for (const item of checklistItems) {
    await provider.createChecklistItem({
      itineraryId: itinerary.id,
      category: item.category as ChecklistCategory,
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

        const googleData = await enrichPlaceWithGoogleData(
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
    hotels: hotel ? [hotel] : [],
    hotel, // Keep singular for backward compatibility if needed
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

  // Extract unique hotels from days for top-level map display
  const uniqueHotelsMap = new Map();
  itinerary.days.forEach((day: any) => {
      if (day.hotel) {
          uniqueHotelsMap.set(day.hotel.id, mapPlaceToHotel(day.hotel));
      }
  });
  const hotels = Array.from(uniqueHotelsMap.values());

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
    hotels, // Fix: Frontend expects this top-level array
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
