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


const HOTEL_CATEGORIES: LocationCategory[] = [LocationCategory.HOTEL, LocationCategory.ACCOMMODATION];

interface ItineraryDayResult {
  id: string;
  dayNumber: number;
  description: string;
  routeDescription: string;
  locations: PlaceExtended[];
  hotel: PlaceExtended | null;
  startingHotel?: PlaceExtended | null;
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


const ACTIVITY_CATEGORIES: Record<TravelStyle, LocationCategory[]> = {
  ADVENTURE: [LocationCategory.HIKING, LocationCategory.ACTIVITY, LocationCategory.BEACH, LocationCategory.PARK, LocationCategory.VIEWPOINT],
  CULTURAL: [LocationCategory.HISTORICAL_SITE, LocationCategory.MUSEUM, LocationCategory.RELIGIOUS_SITE, LocationCategory.MARKET],
  NATURE_ECO: [LocationCategory.PARK, LocationCategory.HIKING, LocationCategory.BEACH, LocationCategory.VIEWPOINT],
  BEACH_RELAXATION: [LocationCategory.BEACH, LocationCategory.CAFE, LocationCategory.VIEWPOINT, LocationCategory.PARK],
  URBAN_CITY: [LocationCategory.SHOPPING, LocationCategory.MARKET, LocationCategory.VIEWPOINT],
  FAMILY_GROUP: [LocationCategory.MUSEUM, LocationCategory.PARK, LocationCategory.ACTIVITY, LocationCategory.SHOPPING],
};


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
   Categories must be EXACTLY one of: ESSENTIALS, WEATHER, TERRAIN, ACTIVITY, SAFETY, DOCUMENTATION.
   - ESSENTIALS: passport, money, essential documents
   - WEATHER: clothing appropriate for climate, sun protection, rain gear
   - TERRAIN: hiking boots, appropriate footwear for the landscape
   - ACTIVITY: sports equipment, cameras, activity-specific gear
   - SAFETY: first aid, emergency contacts, safety equipment
   - DOCUMENTATION: visas, tickets, insurance papers

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
      

      const validatedChecklist = (parsed.checklist || []).map((item: any) => {
        const validCategory = mapToValidChecklistCategory(item.category);
        return {
          ...item,
          category: validCategory,
        };
      }).filter((item: any) => item.category !== null);
      
      return {
        warnings: parsed.warnings || [],
        touristTraps: parsed.touristTraps || [],
        localTips: parsed.localTips || [],
        checklist: validatedChecklist,
      };
    }
  } catch (error) {
    console.error('AI Polish generation failed:', error);
  }
  
  return { warnings: [], touristTraps: [], localTips: [], checklist: [] };
}


function mapToValidChecklistCategory(category: string): ChecklistCategory | null {
  const normalized = category.toUpperCase().trim();
  

  const validCategories: ChecklistCategory[] = [
    ChecklistCategory.ESSENTIALS,
    ChecklistCategory.WEATHER,
    ChecklistCategory.TERRAIN,
    ChecklistCategory.ACTIVITY,
    ChecklistCategory.SAFETY,
    ChecklistCategory.DOCUMENTATION,
  ];
  
  const exactMatch = validCategories.find(c => c === normalized);
  if (exactMatch) return exactMatch;
  

  const categoryMap: Record<string, ChecklistCategory> = {
    'TEC': ChecklistCategory.ESSENTIALS,
    'TECH': ChecklistCategory.ESSENTIALS,
    'TECHNOLOGY': ChecklistCategory.ESSENTIALS,
    'ELECTRONICS': ChecklistCategory.ESSENTIALS,
    'CLOTHING': ChecklistCategory.WEATHER,
    'CLOTHES': ChecklistCategory.WEATHER,
    'TOILETRIES': ChecklistCategory.ESSENTIALS,
    'HEALTH': ChecklistCategory.SAFETY,
    'MEDICAL': ChecklistCategory.SAFETY,
    'MEDICINE': ChecklistCategory.SAFETY,
    'MISC': ChecklistCategory.ESSENTIALS,
    'OTHER': ChecklistCategory.ESSENTIALS,
    'DOCUMENTS': ChecklistCategory.DOCUMENTATION,
    'DOCUMENT': ChecklistCategory.DOCUMENTATION,
    'PAPERS': ChecklistCategory.DOCUMENTATION,
  };
  
  const mapped = categoryMap[normalized];
  if (mapped) {
    console.log(`[CHECKLIST] Mapped invalid category "${category}" to "${mapped}"`);
    return mapped;
  }
  
  console.warn(`[CHECKLIST] Unable to map category "${category}" to a valid ChecklistCategory. Skipping item.`);
  return null;
}


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


function getActivityCategories(travelStyles: TravelStyle[]): LocationCategory[] {
  const categories = new Set<LocationCategory>();
  for (const style of travelStyles) {
    const styleCats = ACTIVITY_CATEGORIES[style] || [];
    styleCats.forEach(cat => categories.add(cat));
  }
  return Array.from(categories);
}


async function findHotelNearLocation(
  lat: number,
  lng: number,
  dbHotels: PlaceExtended[],
  country: string,
  radiusKm: number = 10
): Promise<PlaceExtended | null> {

  const hotelsWithDistance = dbHotels.map(hotel => ({
    hotel,
    distance: Math.sqrt(
      Math.pow(hotel.latitude - lat, 2) + 
      Math.pow(hotel.longitude - lng, 2)
    ) * 111
  }));
  

  const nearbyDbHotels = hotelsWithDistance
    .filter(h => h.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
  
  if (nearbyDbHotels.length > 0) {
    console.log(`[HOTEL] Found DB hotel "${nearbyDbHotels[0].hotel.name}" ${nearbyDbHotels[0].distance.toFixed(1)}km from location`);
    return nearbyDbHotels[0].hotel;
  }
  

  console.log(`[HOTEL] No DB hotels within ${radiusKm}km of (${lat.toFixed(4)}, ${lng.toFixed(4)}), searching Google Places...`);
  
  const googleResult = await searchNearbyHotels(lat, lng, radiusKm * 1000, 4.0);
  
  if (googleResult.hotels.length > 0) {
    const bestHotel = googleResult.hotels[0];
    console.log(`[HOTEL] Found Google hotel "${bestHotel.name}" (${bestHotel.rating}★)`);
    

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

      websiteUrl: bestHotel.websiteUrl,
      bookingUrl: bestHotel.bookingUrl,
      isExternalHotel: true,
    };
    
    return externalHotel;
  }
  
  console.log(`[HOTEL] No hotels found near (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
  return null;
}




function checkLimitedData(fetched: number, requested: number, context: string) {
  if (fetched < requested) {
    console.warn(`[LIMITED DATA] ${context}: Requested ${requested}, but only found ${fetched}. Itinerary quality may degrade.`);
  }
}

export async function generateItinerary(params: GenerateItineraryParams): Promise<ItineraryResult> {
  const { cityId, numberOfDays, budgetLevel, travelStyles, budgetUSD } = params;
  
  // Parse cityId - could be city name or country.
  let country = 'Lebanon'; 
  let cityName = cityId;


  const commonCountries = ['Lebanon', 'France', 'Italy', 'Spain', 'Germany', 'Japan', 'UAE', 'United Arab Emirates'];
  if (commonCountries.some(c => c.toLowerCase() === cityId.toLowerCase())) {
    country = cityId;
    cityName = '';
  }
  
  console.log(`[ITINERARY] Generating clustered itinerary: ${cityName || country}, ${numberOfDays} days, styles: ${travelStyles.join(', ')}...`);
  

  const activityCategories = getActivityCategories(travelStyles);
  if (activityCategories.length === 0) {
     console.warn(`[WARN] No categories match travel styles: ${travelStyles.join(', ')}. Defaulting to general interest.`);
     activityCategories.push(LocationCategory.HISTORICAL_SITE, LocationCategory.VIEWPOINT, LocationCategory.ACTIVITY);
  }

  const activitiesPerDay = 4;
  const targetPoolSize = Math.ceil(numberOfDays * activitiesPerDay * 2.0);
  const priceLevel = mapBudgetToPriceLevel(budgetLevel);
  
  console.log(`[FETCH] Fetching up to ${targetPoolSize} candidate activities (Strict Categories: ${activityCategories.join(', ')})...`);
  
  const activityPool = await fetchPlaces(
    activityCategories,
    country,
    cityName || null, 
    targetPoolSize,
    [],
    undefined
  );

  checkLimitedData(activityPool.length, targetPoolSize, 'Activity Pool');


  if (activityPool.length < targetPoolSize) {
     const missingCount = targetPoolSize - activityPool.length;
     console.log(`[AUGMENT] Pool too small (${activityPool.length} < ${targetPoolSize}). Attempting to fetch ${missingCount} new places from Google...`);
     

     
     for (const cat of activityCategories) {

         const query = `Best ${cat.replace('_', ' ').toLowerCase()} in ${cityName || country}`;
         console.log(`[AUGMENT] Searching: "${query}"`);
         
         const { places } = await searchPlacesByText(query, 4.0);
         
         for (const gp of places) {

             if (activityPool.some(p => p.googlePlaceId === gp.googlePlaceId)) continue;
             

             const existing = await itineraryProvider.findPlaceByGoogleId(gp.googlePlaceId);
             if (existing) {

                 continue;
             }


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
                 classification: LocationClassification.MUST_SEE
             });
             

             activityPool.push({
                 id: newPlace.id,
                 name: gp.name,
                 latitude: gp.latitude,
                 longitude: gp.longitude,
                 category: cat,
                 googlePlaceId: gp.googlePlaceId,
                 rating: gp.rating,
                 priceLevel: gp.priceLevel !== null ? (gp.priceLevel >= 3 ? PriceLevel.EXPENSIVE : gp.priceLevel >= 2 ? PriceLevel.MODERATE : PriceLevel.INEXPENSIVE) : null,
                 costMinUSD: 20,
                 createdAt: new Date(),
                 usageCount: 0,

             } as unknown as PlaceExtended);
         }
         
         if (activityPool.length >= targetPoolSize) break;
     }
  }


  const placesForClustering = activityPool.map(p => ({
    id: p.id,
    name: p.name,
    latitude: p.latitude,
    longitude: p.longitude,
    category: p.category,
    suggestedDuration: 90
  }));


  let clusters = activityPool.length > 0 
    ? kMeansClustering(placesForClustering, Math.min(numberOfDays, activityPool.length))
    : [];

  // Order clusters geographically starting from Airport/Beirut
  const startCoords = { lat: 33.8209, lng: 35.4913 }; 
  clusters = orderClustersByProximity(clusters, startCoords);

  // Balance Clusters (Steal from rich, give to poor)
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



  const days: ItineraryDayResult[] = [];
  const globalUsedIds = new Set<string>();

  const getFullPlaces = (simplePlaces: any[]) => {
    return simplePlaces.map(sp => activityPool.find(ap => ap.id === sp.id)).filter(p => p !== undefined) as PlaceExtended[];
  };


  console.log('[HOTEL] Finding optimal base hotel...');
  
  let baseHotel: PlaceExtended | null = null;
  const overallCentroid = activityPool.length > 0 
    ? calculateCentroid(activityPool) 
    : { lat: 33.8938, lng: 35.5018 };


  const candidateHotels = await findHotelNearLocation(
    overallCentroid.lat,
    overallCentroid.lng,
    await fetchPlaces(HOTEL_CATEGORIES, country, cityName || null, 20, []),
    country,
    15
  );

  baseHotel = candidateHotels;
  

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


  let previousEndLocation = baseHotel 
    ? { lat: baseHotel.latitude, lng: baseHotel.longitude }
    : { lat: 33.8209, lng: 35.4913 };


  for (let i = 0; i < numberOfDays; i++) {
    const dayNum = i + 1;
    const isLastDay = dayNum === numberOfDays;
    

    const dayClusterSimple = clusters[i] || [];
    let dayActivities = getFullPlaces(dayClusterSimple);

    // Limit to max 4 activities per day to prevent exhaustion and "overkill"
    // Also ensures we don't dump 21 places in Day 1.
    const MAX_PER_DAY = 4;
    if (dayActivities.length > MAX_PER_DAY) {

      dayActivities.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      dayActivities = dayActivities.slice(0, MAX_PER_DAY);
    }


    if (dayActivities.length === 0) {
        const unused = activityPool.filter(p => !globalUsedIds.has(p.id));
        if (unused.length > 0) {
            dayActivities = unused.slice(0, 3);
        }
    }


    dayActivities.forEach(p => globalUsedIds.add(p.id));

    // Optimize Route for the Day (Nearest Neighbor)
    // Start from PREVIOUS DAY'S END location (or hotel/airport) to ensure flow
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
    

    dayActivities = dayRouteSimple.map(dr => dayActivities.find(da => da.id === dr.id)!).filter(Boolean);


    if (dayActivities.length > 0) {
        const last = dayActivities[dayActivities.length - 1];
        previousEndLocation = { lat: last.latitude, lng: last.longitude };
    }


    const morningLoc = dayActivities[0] || dayStartPoint;
    const midLoc = dayActivities[Math.floor(dayActivities.length / 2)] || morningLoc;
    const endLoc = dayActivities[dayActivities.length - 1] || midLoc;


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
      hotel: baseHotel,
      startingHotel: isLastDay ? undefined : baseHotel,
      meals: {
        breakfast,
        lunch,
        dinner
      },
      theme,
      isLastDay
    });
  }


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


  let totalEstimatedCostUSD = days.reduce((sum, day) => {
    return sum + day.locations.reduce((dSum, loc) => dSum + (loc.costMinUSD || 20), 0) + (budgetLevel === BudgetLevel.HIGH ? 150 : 50);
  }, 0);


  if (budgetUSD > 0 && totalEstimatedCostUSD > budgetUSD) {
    console.log(`[BUDGET] Over budget ($${totalEstimatedCostUSD} > $${budgetUSD}). Trimming...`);
    

    let allLocs: {loc: PlaceExtended, dayIdx: number}[] = [];
    days.forEach((d, idx) => {
      d.locations.forEach(l => allLocs.push({loc: l, dayIdx: idx}));
    });


    allLocs.sort((a, b) => (b.loc.costMinUSD || 20) - (a.loc.costMinUSD || 20));

    while (totalEstimatedCostUSD > budgetUSD && allLocs.length > 0) {
       const candidate = allLocs.shift();
       if (!candidate) break;


       const day = days[candidate.dayIdx];

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


export async function saveItineraryToDb(
  userId: string,
  input: any,
  generated: ItineraryResult,
  countryName: string,
  airportCode: string,
  provider: IItineraryProvider = itineraryProvider
) {

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
  

  for (const day of generated.days) {

    let hotelId: string | null = null;
    
    if (day.hotel) {
      if (day.hotel.isExternalHotel && day.hotel.googlePlaceId) {

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

        hotelId = day.hotel.id;
      }
    }
    

    const itineraryDay = await provider.createItineraryDay({
      itineraryId: itinerary.id,
      dayNumber: day.dayNumber,
      theme: day.theme || 'Mixed',
      description: day.description,
      hotelId,
    });
    
    console.log(`[DEBUG] Day ${day.dayNumber} saved with hotelId: ${hotelId}, hotel name: ${day.hotel?.name || 'none'}`);
    
    let order = 1;
    

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
  

  const checklistItems = generated.checklist || [];

  
  for (const item of checklistItems) {
    await provider.createChecklistItem({
      itineraryId: itinerary.id,
      category: item.category as ChecklistCategory,
      item: item.item,
      reason: item.reason,
    });
  }

  // Save warnings
  const warningItems = generated.warnings || [];
  for (const warning of warningItems) {
    await provider.createWarning({
      itineraryId: itinerary.id,
      title: warning.title,
      description: warning.description,
    });
  }

  // Save tourist traps
  const touristTrapItems = generated.touristTraps || [];
  for (const trap of touristTrapItems) {
    await provider.createTouristTrap({
      itineraryId: itinerary.id,
      name: trap.name,
      reason: trap.reason,
    });
  }

  // Save local tips
  const localTipItems = generated.localTips || [];
  for (const tip of localTipItems) {
    await provider.createLocalTip({
      itineraryId: itinerary.id,
      tip: tip,
    });
  }
  
  return itinerary;
}



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

          const existingPlace = await itineraryProvider.findPlaceByGoogleId(googleData.data.googlePlaceId);


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
    hotels: result.hotel ? [{
      id: result.hotel.id,
      name: result.hotel.name,
      description: result.hotel.description || `${result.hotel.rating || 4}★ hotel`,
      pricePerNightUSD: { min: 80, max: 150 },
      latitude: result.hotel.latitude,
      longitude: result.hotel.longitude,
      bookingUrl: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(result.hotel.name)}`,
      amenities: ['WiFi', 'Parking', 'Breakfast'],
      neighborhood: result.hotel.city || result.hotel.address || 'City Center',
    }] : [],
    routeSummary: result.routeSummary || '',
  };
}


export function buildItineraryDetailsResponse(
  itinerary: any,
  _countryConfig: any,  // kept for API consistency with buildItineraryResponse
  airportConfig: any
) {
  

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

  // Get the primary hotel (first day's hotel, or first hotel found)
  const primaryHotel = itinerary.days.find((d: any) => d.hotel)?.hotel || null;
  console.log(`[DEBUG] buildItineraryDetailsResponse - primaryHotel found:`, primaryHotel ? `${primaryHotel.name} (id: ${primaryHotel.id})` : 'null');
  console.log(`[DEBUG] First day hotel:`, itinerary.days[0]?.hotel ? `${itinerary.days[0].hotel.name}` : 'null');

  // Map warnings from DB
  const warnings = (itinerary.warnings || []).map((w: any, idx: number) => ({
    id: w.id || `warn-${idx}`,
    title: w.title,
    description: w.description,
  }));

  // Map tourist traps from DB
  const touristTraps = (itinerary.touristTraps || []).map((t: any, idx: number) => ({
    id: t.id || `trap-${idx}`,
    name: t.name,
    reason: t.reason,
  }));

  // Map local tips from DB
  const localTips = (itinerary.localTips || []).map((t: any) => t.tip);

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
    hotel: mapPlaceToHotel(primaryHotel),
    hotels: primaryHotel ? [{
      id: primaryHotel.id,
      name: primaryHotel.name,
      description: primaryHotel.description || `${primaryHotel.rating || 4}★ hotel`,
      pricePerNightUSD: { min: 80, max: 150 }, // Placeholder since we don't track actual prices
      latitude: primaryHotel.latitude,
      longitude: primaryHotel.longitude,
      bookingUrl: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(primaryHotel.name)}`,
      amenities: ['WiFi', 'Parking', 'Breakfast'],
      neighborhood: primaryHotel.city || primaryHotel.address || 'City Center',
    }] : [],
    airport: mapAirportToResponse(airportConfig, {
      country: itinerary.country,
      code: itinerary.airportCode,
    }),
    warnings,
    touristTraps,
    localTips,
    routeSummary: itinerary.routeSummary,
  };
}
