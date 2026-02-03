import { LocationCategory, PriceLevel, LocationClassification } from '../../generated/prisma/client.js';
import { searchPlacesByText } from '../places/google-places.service.js';
import { itineraryProvider } from './itinerary.provider.js';
import { PlaceExtended } from './itinerary.types.js';

/**
 * Augment the activity pool with places from Google Places API.
 * Used when the database doesn't have enough activities.
 */
export async function augmentPoolFromGoogle(
  activityPool: PlaceExtended[],
  activityCategories: LocationCategory[],
  targetPoolSize: number,
  country: string,
  cityName: string
): Promise<PlaceExtended[]> {
  if (activityPool.length >= targetPoolSize) {
    return activityPool;
  }

  const missingCount = targetPoolSize - activityPool.length;
  console.log(`[AUGMENT] Pool too small (${activityPool.length} < ${targetPoolSize}). Attempting to fetch ${missingCount} new places from Google...`);

  for (const cat of activityCategories) {
    const query = `Best ${cat.replace('_', ' ').toLowerCase()} in ${cityName || country}`;
    console.log(`[AUGMENT] Searching: "${query}"`);

    const { places } = await searchPlacesByText(query, 4.0);

    for (const gp of places) {
      if (activityPool.some(p => p.googlePlaceId === gp.googlePlaceId)) continue;

      const existing = await itineraryProvider.findPlaceByGoogleId(gp.googlePlaceId);
      if (existing) continue;

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
        priceLevel: gp.priceLevel !== null
          ? (gp.priceLevel >= 3 ? PriceLevel.EXPENSIVE : gp.priceLevel >= 2 ? PriceLevel.MODERATE : PriceLevel.INEXPENSIVE)
          : null,
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
        priceLevel: gp.priceLevel !== null
          ? (gp.priceLevel >= 3 ? PriceLevel.EXPENSIVE : gp.priceLevel >= 2 ? PriceLevel.MODERATE : PriceLevel.INEXPENSIVE)
          : null,
        costMinUSD: 20,
        createdAt: new Date(),
        usageCount: 0,
      } as unknown as PlaceExtended);
    }

    if (activityPool.length >= targetPoolSize) break;
  }

  console.log(`[AUGMENT] Pool size after augmentation: ${activityPool.length}`);
  return activityPool;
}
