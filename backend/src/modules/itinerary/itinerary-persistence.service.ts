import { ChecklistCategory, ItineraryItemType, LocationClassification } from '../../generated/prisma/client.js';
import { enrichPlaceWithGoogleData } from '../places/google-places.service.js';
import { itineraryProvider } from './itinerary.provider.js';
import { IItineraryProvider } from './itinerary.contract.js';
import { ItineraryResult, DayWithLocations } from './itinerary.types.js';

/**
 * Save a generated itinerary to the database including all related entities:
 * days, items, checklist, warnings, tourist traps, and local tips.
 */
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
        // Save external hotel to DB first
        const savedHotel = await provider.createExternalHotel({
          googlePlaceId: day.hotel.googlePlaceId,
          name: day.hotel.name,
          latitude: day.hotel.latitude,
          longitude: day.hotel.longitude,
          country: day.hotel.country,
          classification: LocationClassification.MUST_SEE,
          description: day.hotel.description ?? `${day.hotel.rating ?? 0}★ hotel with ${day.hotel.totalRatings ?? 0} reviews`,
          city: day.hotel.city ?? undefined,
          address: day.hotel.address ?? undefined,
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
    
    // Save activity items
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
    
    // Save meal items
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
  
  // Save checklist items
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

/**
 * Enrich locations with Google Places data (photos, ratings, opening hours).
 */
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
          
          // Update in-memory location object
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
