import { LocationCategory, PriceLevel, LocationClassification } from '../../generated/prisma/client.js';
import { BudgetLevel, mapBudgetToPriceLevel } from '../../utils/enum-mappers.js';
import { v4 as uuidv4 } from 'uuid';
import { searchPlacesByText } from '../places/google-places.service.js';
import { nearestNeighborRoute, kMeansClustering, orderClustersByProximity } from './route-optimizer.service.js';
import { itineraryProvider } from './itinerary.provider.js';
import { calculateCentroid, haversineDistance } from '../../utils/geo.utils.js';

// Import from decomposed modules
import { 
  PlaceExtended, 
  GenerateItineraryParams, 
  ItineraryDayResult, 
  ItineraryResult,
  DayLocation,
  DayWithLocations,
  HOTEL_CATEGORIES 
} from './itinerary.types.js';
import { generateAIPolish } from './ai-polish.service.js';
import { fetchPlaces, getActivityCategories, checkLimitedData } from './place.utils.js';
import { findHotelNearLocation } from './hotel.service.js';

// Re-export types and functions for backward compatibility
export type { PlaceExtended, GenerateItineraryParams, ItineraryDayResult, ItineraryResult, DayLocation, DayWithLocations };
export { saveItineraryToDb, enrichLocations } from './itinerary-persistence.service.js';
export { buildItineraryResponse, buildItineraryDetailsResponse } from './itinerary-response.builder.js';

/**
 * Generate a complete itinerary based on travel parameters.
 * This is the main orchestration function that coordinates all sub-services.
 */
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

  // Augment pool with Google Places if needed
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

  // Prepare places for clustering
  const placesForClustering = activityPool.map(p => ({
    id: p.id,
    name: p.name,
    latitude: p.latitude,
    longitude: p.longitude,
    category: p.category,
    suggestedDuration: 90
  }));

  // Cluster activities by geography
  let clusters = activityPool.length > 0 
    ? kMeansClustering(placesForClustering, Math.min(numberOfDays, activityPool.length))
    : [];

  console.log(`[CLUSTER] Created ${clusters.length} clusters with distribution: ${clusters.map(c => c.length).join(', ')}`);

  // Order clusters geographically starting from Airport/Beirut
  const startCoords = { lat: 33.8209, lng: 35.4913 }; 
  clusters = orderClustersByProximity(clusters, startCoords);

  // Enhanced Balance Clusters - Ensure each day has close to the average number of activities
  const totalActivities = clusters.reduce((sum, c) => sum + c.length, 0);
  const targetPerDay = Math.floor(totalActivities / numberOfDays);
  const MIN_PER_DAY = Math.max(3, targetPerDay - 1);
  const MAX_PER_DAY_CLUSTER = targetPerDay + 2;
  const MAX_ATTEMPTS = 30;
  let attempts = 0;
  let rebalanced = true;

  console.log(`[CLUSTER] Target per day: ${targetPerDay}, Min: ${MIN_PER_DAY}, Max: ${MAX_PER_DAY_CLUSTER}`);

  while(rebalanced && attempts < MAX_ATTEMPTS) {
      rebalanced = false;
      attempts++;
      
      let minLen = Infinity, maxLen = -Infinity;
      let minIdx = -1, maxIdx = -1;

      clusters.forEach((c, idx) => {
          if (c.length < minLen) { minLen = c.length; minIdx = idx; }
          if (c.length > maxLen) { maxLen = c.length; maxIdx = idx; }
      });

      // Transfer from over-capacity clusters to under-capacity clusters
      if (minIdx !== -1 && maxIdx !== -1 && (minLen < MIN_PER_DAY || maxLen > MAX_PER_DAY_CLUSTER)) {
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

           if (bestTransferIdx !== -1 && clusters[maxIdx].length > 1) {
               const item = clusters[maxIdx].splice(bestTransferIdx, 1)[0];
               clusters[minIdx].push(item);
               rebalanced = true; 
           }
      }
  }

  console.log(`[CLUSTER] After rebalancing (${attempts} attempts): ${clusters.map(c => c.length).join(', ')}`);

  const days: ItineraryDayResult[] = [];
  const globalUsedIds = new Set<string>();

  const getFullPlaces = (simplePlaces: any[]) => {
    return simplePlaces.map(sp => activityPool.find(ap => ap.id === sp.id)).filter(p => p !== undefined) as PlaceExtended[];
  };

  // Find base hotel
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

  // Generate each day
  for (let i = 0; i < numberOfDays; i++) {
    const dayNum = i + 1;
    const isLastDay = dayNum === numberOfDays;
    
    const dayClusterSimple = clusters[i] || [];
    let dayActivities = getFullPlaces(dayClusterSimple);

    console.log(`[DAY ${dayNum}] Cluster assigned ${dayClusterSimple.length} activities`);

    // Limit to max 4 activities per day
    const MAX_PER_DAY = 4;
    if (dayActivities.length > MAX_PER_DAY) {
      dayActivities.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      dayActivities = dayActivities.slice(0, MAX_PER_DAY);
      console.log(`[DAY ${dayNum}] Limited to ${MAX_PER_DAY} activities (sorted by rating)`);
    }

    if (dayActivities.length === 0) {
        const unused = activityPool.filter(p => !globalUsedIds.has(p.id));
        if (unused.length > 0) {
            dayActivities = unused.slice(0, 3);
            console.log(`[DAY ${dayNum}] No activities in cluster, added ${dayActivities.length} from unused pool`);
        }
    }

    console.log(`[DAY ${dayNum}] Final activity count: ${dayActivities.length}`);

    dayActivities.forEach(p => globalUsedIds.add(p.id));

    // Optimize route for the day
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

    // Fetch restaurants for meals
    console.log(`[MEALS] Day ${dayNum}: Fetching restaurants for breakfast, lunch, dinner...`);
    
    const BREAKFAST_RADIUS_KM = 15;
    const LUNCH_RADIUS_KM = 15;
    const DINNER_RADIUS_KM = 20;
    
    const [breakfasts, lunches, dinners] = await Promise.all([
        fetchPlaces([LocationCategory.CAFE, LocationCategory.RESTAURANT], country, null, 10, Array.from(globalUsedIds), priceLevel).then(res => {
            const filtered = res.filter(r => haversineDistance(r.latitude, r.longitude, morningLoc.latitude, morningLoc.longitude) < BREAKFAST_RADIUS_KM);
            console.log(`[MEALS] Breakfast: Found ${res.length} cafes/restaurants, ${filtered.length} within ${BREAKFAST_RADIUS_KM}km`);
            return filtered;
        }),
        fetchPlaces([LocationCategory.RESTAURANT], country, null, 10, Array.from(globalUsedIds), priceLevel).then(res => {
            const filtered = res.filter(r => haversineDistance(r.latitude, r.longitude, midLoc.latitude, midLoc.longitude) < LUNCH_RADIUS_KM);
            console.log(`[MEALS] Lunch: Found ${res.length} restaurants, ${filtered.length} within ${LUNCH_RADIUS_KM}km`);
            return filtered;
        }),
        fetchPlaces([LocationCategory.RESTAURANT, LocationCategory.BAR], country, null, 10, Array.from(globalUsedIds), priceLevel).then(res => {
            const filtered = res.filter(r => haversineDistance(r.latitude, r.longitude, endLoc.latitude, endLoc.longitude) < DINNER_RADIUS_KM);
            console.log(`[MEALS] Dinner: Found ${res.length} restaurants/bars, ${filtered.length} within ${DINNER_RADIUS_KM}km`);
            return filtered;
        })
    ]);

    // Track used meal IDs within this day to prevent duplicates
    const dayMealIds = new Set<string>();

    let breakfast = breakfasts.find(r => !dayMealIds.has(r.id)) || null;
    if (breakfast) dayMealIds.add(breakfast.id);

    let lunch = lunches.find(r => !dayMealIds.has(r.id)) || null;
    if (lunch) dayMealIds.add(lunch.id);

    let dinner = dinners.find(r => !dayMealIds.has(r.id)) || null;

    // Fallback to Google Places for meals if not found in DB
    if (!breakfast && morningLoc.latitude && morningLoc.longitude) {
        console.log(`[MEALS] Searching Google Places for breakfast near ${morningLoc.name || 'start'}...`);
        const googleResult = await searchPlacesByText(`restaurant OR cafe near ${morningLoc.name || country}`, 3.5);
        if (googleResult.places.length > 0) {
            const nearbyPlace = googleResult.places.find(p => 
                haversineDistance(p.latitude, p.longitude, morningLoc.latitude, morningLoc.longitude) < BREAKFAST_RADIUS_KM &&
                !dayMealIds.has(p.googlePlaceId)
            );
            if (nearbyPlace) {
                const savedPlace = await itineraryProvider.createPlace({
                    googlePlaceId: nearbyPlace.googlePlaceId,
                    name: nearbyPlace.name,
                    latitude: nearbyPlace.latitude,
                    longitude: nearbyPlace.longitude,
                    country,
                    city: cityName || country,
                    address: nearbyPlace.formattedAddress,
                    category: LocationCategory.RESTAURANT,
                    description: `${nearbyPlace.rating}★ breakfast spot`,
                    rating: nearbyPlace.rating,
                    totalRatings: nearbyPlace.totalRatings,
                    priceLevel: nearbyPlace.priceLevel !== null ? (nearbyPlace.priceLevel >= 3 ? PriceLevel.EXPENSIVE : nearbyPlace.priceLevel >= 2 ? PriceLevel.MODERATE : PriceLevel.INEXPENSIVE) : null,
                    imageUrl: nearbyPlace.photos[0] || null,
                    imageUrls: nearbyPlace.photos,
                    websiteUrl: nearbyPlace.websiteUrl,
                    classification: LocationClassification.HIDDEN_GEM,
                });
                breakfast = { id: savedPlace.id, ...nearbyPlace } as unknown as PlaceExtended;
                dayMealIds.add(savedPlace.id);
                console.log(`[MEALS] ✓ Found Google breakfast: ${nearbyPlace.name}`);
            }
        }
    }

    if (!lunch && midLoc.latitude && midLoc.longitude) {
        console.log(`[MEALS] Searching Google Places for lunch near ${midLoc.name || 'mid'}...`);
        const googleResult = await searchPlacesByText(`restaurant near ${midLoc.name || country}`, 3.5);
        if (googleResult.places.length > 0) {
            const nearbyPlace = googleResult.places.find(p => 
                haversineDistance(p.latitude, p.longitude, midLoc.latitude, midLoc.longitude) < LUNCH_RADIUS_KM &&
                !dayMealIds.has(p.googlePlaceId)
            );
            if (nearbyPlace) {
                const savedPlace = await itineraryProvider.createPlace({
                    googlePlaceId: nearbyPlace.googlePlaceId,
                    name: nearbyPlace.name,
                    latitude: nearbyPlace.latitude,
                    longitude: nearbyPlace.longitude,
                    country,
                    city: cityName || country,
                    address: nearbyPlace.formattedAddress,
                    category: LocationCategory.RESTAURANT,
                    description: `${nearbyPlace.rating}★ lunch spot`,
                    rating: nearbyPlace.rating,
                    totalRatings: nearbyPlace.totalRatings,
                    priceLevel: nearbyPlace.priceLevel !== null ? (nearbyPlace.priceLevel >= 3 ? PriceLevel.EXPENSIVE : nearbyPlace.priceLevel >= 2 ? PriceLevel.MODERATE : PriceLevel.INEXPENSIVE) : null,
                    imageUrl: nearbyPlace.photos[0] || null,
                    imageUrls: nearbyPlace.photos,
                    websiteUrl: nearbyPlace.websiteUrl,
                    classification: LocationClassification.HIDDEN_GEM,
                });
                lunch = { id: savedPlace.id, ...nearbyPlace } as unknown as PlaceExtended;
                dayMealIds.add(savedPlace.id);
                console.log(`[MEALS] ✓ Found Google lunch: ${nearbyPlace.name}`);
            }
        }
    }

    if (!dinner && endLoc.latitude && endLoc.longitude) {
        console.log(`[MEALS] Searching Google Places for dinner near ${endLoc.name || 'end'}...`);
        const googleResult = await searchPlacesByText(`restaurant OR bar near ${endLoc.name || country}`, 3.5);
        if (googleResult.places.length > 0) {
            const nearbyPlace = googleResult.places.find(p => 
                haversineDistance(p.latitude, p.longitude, endLoc.latitude, endLoc.longitude) < DINNER_RADIUS_KM &&
                !dayMealIds.has(p.googlePlaceId)
            );
            if (nearbyPlace) {
                const savedPlace = await itineraryProvider.createPlace({
                    googlePlaceId: nearbyPlace.googlePlaceId,
                    name: nearbyPlace.name,
                    latitude: nearbyPlace.latitude,
                    longitude: nearbyPlace.longitude,
                    country,
                    city: cityName || country,
                    address: nearbyPlace.formattedAddress,
                    category: LocationCategory.RESTAURANT,
                    description: `${nearbyPlace.rating}★ dinner spot`,
                    rating: nearbyPlace.rating,
                    totalRatings: nearbyPlace.totalRatings,
                    priceLevel: nearbyPlace.priceLevel !== null ? (nearbyPlace.priceLevel >= 3 ? PriceLevel.EXPENSIVE : nearbyPlace.priceLevel >= 2 ? PriceLevel.MODERATE : PriceLevel.INEXPENSIVE) : null,
                    imageUrl: nearbyPlace.photos[0] || null,
                    imageUrls: nearbyPlace.photos,
                    websiteUrl: nearbyPlace.websiteUrl,
                    classification: LocationClassification.HIDDEN_GEM,
                });
                dinner = { id: savedPlace.id, ...nearbyPlace } as unknown as PlaceExtended;
                dayMealIds.add(savedPlace.id);
                console.log(`[MEALS] ✓ Found Google dinner: ${nearbyPlace.name}`);
            }
        }
    }

    if (breakfast) {
        globalUsedIds.add(breakfast.id);
        console.log(`[MEALS] ✓ Breakfast: ${breakfast.name}`);
    } else {
        console.log(`[MEALS] ✗ No breakfast found for Day ${dayNum}`);
    }
    
    if (lunch) {
        globalUsedIds.add(lunch.id);
        console.log(`[MEALS] ✓ Lunch: ${lunch.name}`);
    } else {
        console.log(`[MEALS] ✗ No lunch found for Day ${dayNum}`);
    }
    
    if (dinner) {
        globalUsedIds.add(dinner.id);
        console.log(`[MEALS] ✓ Dinner: ${dinner.name}`);
    } else {
        console.log(`[MEALS] ✗ No dinner found for Day ${dayNum}`);
    }
    
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

  // Generate AI Polish
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

  // Calculate and potentially trim budget
  let totalEstimatedCostUSD = days.reduce((sum, day) => {
    return sum + day.locations.reduce((dSum, loc) => dSum + (loc.costMinUSD || 20), 0) + (budgetLevel === BudgetLevel.HIGH ? 150 : 50);
  }, 0);

  const budgetWithBuffer = budgetUSD * 1.10;

  if (budgetUSD > 0 && totalEstimatedCostUSD > budgetWithBuffer) {
    console.log(`[BUDGET] Over budget ($${totalEstimatedCostUSD} > $${budgetUSD} + 10% buffer). Trimming...`);
    
    let allLocs: {loc: PlaceExtended, dayIdx: number}[] = [];
    days.forEach((d, idx) => {
      d.locations.forEach(l => allLocs.push({loc: l, dayIdx: idx}));
    });

    allLocs.sort((a, b) => (b.loc.costMinUSD || 20) - (a.loc.costMinUSD || 20));

    let removedCount = 0;
    while (totalEstimatedCostUSD > budgetWithBuffer && allLocs.length > 0) {
       const candidate = allLocs.shift();
       if (!candidate) break;

       const day = days[candidate.dayIdx];

       if (day.locations.length > 3) {
         day.locations = day.locations.filter(l => l.id !== candidate.loc.id);
         totalEstimatedCostUSD -= (candidate.loc.costMinUSD || 20);
         removedCount++;
         console.log(`[BUDGET] Removed expensive item "${candidate.loc.name}" to save $${candidate.loc.costMinUSD || 20}`);
       }
    }
    console.log(`[BUDGET] Trimming complete. Removed ${removedCount} activities. New total: $${totalEstimatedCostUSD}`);
  } else {
    console.log(`[BUDGET] Within budget: $${totalEstimatedCostUSD} <= $${budgetUSD}`);
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
