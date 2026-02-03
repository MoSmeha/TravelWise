import { searchNearbyHotels } from '../places/google-places.service.js';
import { PlaceExtended } from './itinerary.types.js';

/**
 * Find a hotel near a specific location, first checking DB hotels,
 * then falling back to Google Places API if needed.
 */
export async function findHotelNearLocation(
  lat: number,
  lng: number,
  dbHotels: PlaceExtended[],
  country: string,
  radiusKm: number = 10
): Promise<PlaceExtended | null> {
  // Calculate distance for each DB hotel
  const hotelsWithDistance = dbHotels.map(hotel => ({
    hotel,
    distance: Math.sqrt(
      Math.pow(hotel.latitude - lat, 2) + 
      Math.pow(hotel.longitude - lng, 2)
    ) * 111
  }));
  
  // Filter and sort by distance
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
    
    // Create external hotel object
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
