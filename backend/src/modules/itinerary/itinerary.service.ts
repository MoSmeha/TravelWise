import { LocationCategory } from '../../generated/prisma/client.js';
import { BudgetLevel, mapBudgetToPriceLevel } from '../shared/utils/enum-mappers.js';
import { v4 as uuidv4 } from 'uuid';
import { nearestNeighborRoute, kMeansClustering, orderClustersByProximity } from './route-optimizer.service.js';
import { calculateCentroid } from '../shared/utils/geo.utils.js';

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
import { augmentPoolFromGoogle } from './pool-augment.service.js';
import { balanceClusters } from './cluster-balance.utils.js';
import { fetchMealsForDay } from './meal.service.js';

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
  
  let activityPool = await fetchPlaces(
    activityCategories,
    country,
    cityName || null, 
    targetPoolSize,
    [],
    undefined
  );

  checkLimitedData(activityPool.length, targetPoolSize, 'Activity Pool');

  // Augment pool with Google Places if needed
  activityPool = await augmentPoolFromGoogle(activityPool, activityCategories, targetPoolSize, country, cityName);

  // Prepare places for clustering
  const placesForClustering = activityPool.map(p => ({
    id: p.id,
    name: p.name,
    latitude: p.latitude,
    longitude: p.longitude,
    category: p.category as string,
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

  // Balance clusters for even distribution
  clusters = balanceClusters(clusters, numberOfDays, startCoords);

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

    // Fetch meals for the day
    console.log(`[MEALS] Day ${dayNum}: Fetching restaurants...`);
    const { meals, usedIds: mealUsedIds } = await fetchMealsForDay(
      morningLoc,
      midLoc,
      endLoc,
      country,
      cityName,
      priceLevel,
      globalUsedIds
    );
    mealUsedIds.forEach(id => globalUsedIds.add(id));
    
    const theme = dayActivities.length > 0 ? (dayActivities[0].category as string) : 'Relaxation';

    days.push({
      id: uuidv4(),
      dayNumber: dayNum,
      description: `Day ${dayNum}: ${theme} in ${dayActivities[0]?.city || country}`,
      routeDescription: dayActivities.map(d => d.name).join(' -> '),
      locations: dayActivities,
      hotel: baseHotel,
      startingHotel: isLastDay ? undefined : baseHotel,
      meals,
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
