import { LocationCategory, PriceLevel, LocationClassification } from '../../generated/prisma/client.js';
import { TravelStyle } from '../../utils/enum-mappers.js';
import { itineraryProvider } from './itinerary.provider.js';
import { IItineraryProvider } from './itinerary.contract.js';
import { PlaceExtended, ACTIVITY_CATEGORIES } from './itinerary.types.js';

/**
 * Get priority ranking for place classifications.
 * MUST_SEE and HIDDEN_GEM share highest priority.
 */
export function getClassificationPriority(classification: LocationClassification): number {
  switch (classification) {
    case LocationClassification.MUST_SEE:
    case LocationClassification.HIDDEN_GEM:
      return 0;
    case LocationClassification.CONDITIONAL:
      return 1;
    case LocationClassification.TOURIST_TRAP:
      return 2;
    default:
      return 3;
  }
}

/**
 * Detect if categories are food-related (tourist traps allowed for food).
 */
export function isFoodCategory(categories: LocationCategory[]): boolean {
  return categories.some(cat => 
    cat === LocationCategory.RESTAURANT || 
    cat === LocationCategory.CAFE || 
    cat === LocationCategory.BAR
  );
}

/**
 * Fetch places from database with classification-based sorting and fallback strategy.
 */
export async function fetchPlaces(
  categories: LocationCategory[],
  country: string,
  city: string | null,
  limit: number,
  excludeIds: string[] = [],
  priceLevel?: PriceLevel,
  provider: IItineraryProvider = itineraryProvider
): Promise<PlaceExtended[]> {
  const isFood = isFoodCategory(categories);
  
  // Fetch more than needed to allow for sorting and filtering
  const fetchLimit = limit * 2;
  
  let places = await provider.fetchPlaces({
    categories,
    country,
    city,
    limit: fetchLimit,
    excludeIds,
    priceLevel,
    excludeTouristTraps: !isFood, // Only exclude tourist traps for non-food categories
  });

  // Sort by custom classification priority, then by rating and popularity
  places.sort((a, b) => {
    const priorityDiff = getClassificationPriority(a.classification) - getClassificationPriority(b.classification);
    if (priorityDiff !== 0) return priorityDiff;
    const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
    if (ratingDiff !== 0) return ratingDiff;
    return (b.popularity ?? 0) - (a.popularity ?? 0);
  });

  // Take only the requested limit after sorting
  places = places.slice(0, limit);

  // Fallback strategy: If not enough city-specific places found, fill with country-wide places
  if (places.length < limit && city) {
    const existingIds = [...excludeIds, ...places.map(p => p.id)];
    
    const countryPlaces = await provider.fetchPlaces({
      categories,
      country,
      city: null, // Search country-wide
      limit: limit - places.length,
      excludeIds: existingIds,
      priceLevel,
      excludeTouristTraps: !isFood,
    });
    
    // Sort fallback places the same way
    countryPlaces.sort((a, b) => {
      const priorityDiff = getClassificationPriority(a.classification) - getClassificationPriority(b.classification);
      if (priorityDiff !== 0) return priorityDiff;
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
    
    places = [...places, ...countryPlaces];
  }

  return places as PlaceExtended[];
}

/**
 * Map travel styles to their corresponding location categories.
 */
export function getActivityCategories(travelStyles: TravelStyle[]): LocationCategory[] {
  const categories = new Set<LocationCategory>();
  for (const style of travelStyles) {
    const styleCats = ACTIVITY_CATEGORIES[style] || [];
    styleCats.forEach(cat => categories.add(cat));
  }
  return Array.from(categories);
}

/**
 * Log warning when limited data is available.
 */
export function checkLimitedData(fetched: number, requested: number, context: string): void {
  if (fetched < requested) {
    console.warn(`[LIMITED DATA] ${context}: Requested ${requested}, but only found ${fetched}. Itinerary quality may degrade.`);
  }
}
