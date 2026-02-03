import { LocationCategory, PriceLevel, LocationClassification } from '../../generated/prisma/client.js';
import { searchPlacesByText } from '../places/google-places.service.js';
import { itineraryProvider } from './itinerary.provider.js';
import { haversineDistance } from '../shared/utils/geo.utils.js';
import { PlaceExtended } from './itinerary.types.js';
import { fetchPlaces } from './place.utils.js';

export interface MealLocations {
  breakfast: PlaceExtended | null;
  lunch: PlaceExtended | null;
  dinner: PlaceExtended | null;
}

interface LocationPoint {
  latitude: number;
  longitude: number;
  name?: string;
}

const BREAKFAST_RADIUS_KM = 15;
const LUNCH_RADIUS_KM = 15;
const DINNER_RADIUS_KM = 20;

/**
 * Fetch meals for a day based on activity locations.
 * Falls back to Google Places if no DB results found.
 */
export async function fetchMealsForDay(
  morningLoc: LocationPoint,
  midLoc: LocationPoint,
  endLoc: LocationPoint,
  country: string,
  cityName: string,
  priceLevel: PriceLevel | undefined,
  excludeIds: Set<string>
): Promise<{ meals: MealLocations; usedIds: string[] }> {
  const dayMealIds = new Set<string>();
  const usedIds: string[] = [];

  console.log(`[MEALS] Fetching restaurants for breakfast, lunch, dinner...`);

  const [breakfasts, lunches, dinners] = await Promise.all([
    fetchPlaces([LocationCategory.CAFE, LocationCategory.RESTAURANT], country, null, 10, Array.from(excludeIds), priceLevel).then(res => {
      const filtered = res.filter(r => haversineDistance(r.latitude, r.longitude, morningLoc.latitude, morningLoc.longitude) < BREAKFAST_RADIUS_KM);
      console.log(`[MEALS] Breakfast: Found ${res.length} cafes/restaurants, ${filtered.length} within ${BREAKFAST_RADIUS_KM}km`);
      return filtered;
    }),
    fetchPlaces([LocationCategory.RESTAURANT], country, null, 10, Array.from(excludeIds), priceLevel).then(res => {
      const filtered = res.filter(r => haversineDistance(r.latitude, r.longitude, midLoc.latitude, midLoc.longitude) < LUNCH_RADIUS_KM);
      console.log(`[MEALS] Lunch: Found ${res.length} restaurants, ${filtered.length} within ${LUNCH_RADIUS_KM}km`);
      return filtered;
    }),
    fetchPlaces([LocationCategory.RESTAURANT, LocationCategory.BAR], country, null, 10, Array.from(excludeIds), priceLevel).then(res => {
      const filtered = res.filter(r => haversineDistance(r.latitude, r.longitude, endLoc.latitude, endLoc.longitude) < DINNER_RADIUS_KM);
      console.log(`[MEALS] Dinner: Found ${res.length} restaurants/bars, ${filtered.length} within ${DINNER_RADIUS_KM}km`);
      return filtered;
    })
  ]);

  let breakfast = breakfasts.find(r => !dayMealIds.has(r.id)) || null;
  if (breakfast) dayMealIds.add(breakfast.id);

  let lunch = lunches.find(r => !dayMealIds.has(r.id)) || null;
  if (lunch) dayMealIds.add(lunch.id);

  let dinner = dinners.find(r => !dayMealIds.has(r.id)) || null;

  // Fallback to Google Places for meals if not found in DB
  if (!breakfast && morningLoc.latitude && morningLoc.longitude) {
    breakfast = await findGoogleMeal(morningLoc, 'breakfast', BREAKFAST_RADIUS_KM, country, cityName, dayMealIds);
    if (breakfast) dayMealIds.add(breakfast.id);
  }

  if (!lunch && midLoc.latitude && midLoc.longitude) {
    lunch = await findGoogleMeal(midLoc, 'lunch', LUNCH_RADIUS_KM, country, cityName, dayMealIds);
    if (lunch) dayMealIds.add(lunch.id);
  }

  if (!dinner && endLoc.latitude && endLoc.longitude) {
    dinner = await findGoogleMeal(endLoc, 'dinner', DINNER_RADIUS_KM, country, cityName, dayMealIds);
    if (dinner) dayMealIds.add(dinner.id);
  }

  // Log results
  if (breakfast) {
    usedIds.push(breakfast.id);
    console.log(`[MEALS] ✓ Breakfast: ${breakfast.name}`);
  } else {
    console.log(`[MEALS] ✗ No breakfast found`);
  }

  if (lunch) {
    usedIds.push(lunch.id);
    console.log(`[MEALS] ✓ Lunch: ${lunch.name}`);
  } else {
    console.log(`[MEALS] ✗ No lunch found`);
  }

  if (dinner) {
    usedIds.push(dinner.id);
    console.log(`[MEALS] ✓ Dinner: ${dinner.name}`);
  } else {
    console.log(`[MEALS] ✗ No dinner found`);
  }

  return {
    meals: { breakfast, lunch, dinner },
    usedIds
  };
}

/**
 * Search Google Places for a meal option near a location.
 */
async function findGoogleMeal(
  location: LocationPoint,
  mealType: 'breakfast' | 'lunch' | 'dinner',
  radiusKm: number,
  country: string,
  cityName: string,
  excludeIds: Set<string>
): Promise<PlaceExtended | null> {
  const searchQuery = mealType === 'breakfast'
    ? `restaurant OR cafe near ${location.name || country}`
    : mealType === 'dinner'
    ? `restaurant OR bar near ${location.name || country}`
    : `restaurant near ${location.name || country}`;

  console.log(`[MEALS] Searching Google Places for ${mealType} near ${location.name || 'location'}...`);
  const googleResult = await searchPlacesByText(searchQuery, 3.5);

  if (googleResult.places.length === 0) return null;

  const nearbyPlace = googleResult.places.find(p =>
    haversineDistance(p.latitude, p.longitude, location.latitude, location.longitude) < radiusKm &&
    !excludeIds.has(p.googlePlaceId)
  );

  if (!nearbyPlace) return null;

  const savedPlace = await itineraryProvider.createPlace({
    googlePlaceId: nearbyPlace.googlePlaceId,
    name: nearbyPlace.name,
    latitude: nearbyPlace.latitude,
    longitude: nearbyPlace.longitude,
    country,
    city: cityName || country,
    address: nearbyPlace.formattedAddress,
    category: LocationCategory.RESTAURANT,
    description: `${nearbyPlace.rating}★ ${mealType} spot`,
    rating: nearbyPlace.rating,
    totalRatings: nearbyPlace.totalRatings,
    priceLevel: nearbyPlace.priceLevel !== null
      ? (nearbyPlace.priceLevel >= 3 ? PriceLevel.EXPENSIVE : nearbyPlace.priceLevel >= 2 ? PriceLevel.MODERATE : PriceLevel.INEXPENSIVE)
      : null,
    imageUrl: nearbyPlace.photos[0] || null,
    imageUrls: nearbyPlace.photos,
    websiteUrl: nearbyPlace.websiteUrl,
    classification: LocationClassification.HIDDEN_GEM,
  });

  console.log(`[MEALS] ✓ Found Google ${mealType}: ${nearbyPlace.name}`);

  return { id: savedPlace.id, ...nearbyPlace } as unknown as PlaceExtended;
}
