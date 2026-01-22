import { LocationCategory, LocationClassification } from '../generated/prisma/client.js';
import prisma from '../lib/prisma.js';
import {
  CreateChecklistItemData,
  CreateExternalHotelData,
  CreateItineraryData,
  CreateItineraryDayData,
  CreateItineraryItemData,
  CreatedItinerary,
  CreatePlaceData,
  FetchPlacesParams,
  IItineraryProvider,
  ItineraryDayRecord,
  PlaceRecord,
  UpdatePlaceEnrichmentData,
  UserItinerarySummary,
  UserItineraryWithDays,
} from '../provider-contract/itinerary.provider-contract.js';


class ItineraryPgProvider implements IItineraryProvider {
  // Place Operations

  async fetchPlaces(params: FetchPlacesParams): Promise<PlaceRecord[]> {
    const { categories, country, city, limit, excludeIds = [], priceLevel } = params;

    const where: any = {
      classification: { not: LocationClassification.TOURIST_TRAP },
      category: { in: categories },
      country: { equals: country, mode: 'insensitive' },
    };

    // Add city filter if provided
    if (city) {
      where.city = { equals: city, mode: 'insensitive' };
    }

    // Filter by price level if specified
    if (priceLevel) {
      where.priceLevel = priceLevel;
    }

    // Exclude already used places
    if (excludeIds.length > 0) {
      where.id = { notIn: excludeIds };
    }

    let places = await prisma.place.findMany({
      where,
      orderBy: [
        { classification: 'asc' }, // Hidden gems and must-see first
        { rating: 'desc' },
        { popularity: 'desc' },
      ],
      take: limit,
    });

    // Fallback to country-wide if not enough city-specific places
    if (places.length < limit && city) {
      const fallbackWhere: any = {
        classification: { not: LocationClassification.TOURIST_TRAP },
        category: { in: categories },
        country: { equals: country, mode: 'insensitive' },
        id: { notIn: [...excludeIds, ...places.map((p) => p.id)] },
      };
      
      // Apply same price filter to fallback
      if (priceLevel) {
        fallbackWhere.priceLevel = priceLevel;
      }
      
      const countryPlaces = await prisma.place.findMany({
        where: fallbackWhere,
        orderBy: [{ classification: 'asc' }, { rating: 'desc' }, { popularity: 'desc' }],
        take: limit - places.length,
      });
      places = [...places, ...countryPlaces];
    }

    return places as PlaceRecord[];
  }

  async findPlaceByGoogleId(googlePlaceId: string): Promise<{ id: string } | null> {
    return prisma.place.findUnique({
      where: { googlePlaceId },
      select: { id: true },
    });
  }

  async updatePlaceEnrichment(placeId: string, data: UpdatePlaceEnrichmentData): Promise<void> {
    await prisma.place.update({
      where: { id: placeId },
      data: {
        ...(data.googlePlaceId !== undefined ? { googlePlaceId: data.googlePlaceId } : {}),
        ...(data.rating !== undefined ? { rating: data.rating } : {}),
        ...(data.totalRatings !== undefined ? { totalRatings: data.totalRatings } : {}),
        ...(data.topReviews !== undefined ? { topReviews: data.topReviews } : {}),
        ...(data.imageUrls !== undefined ? { imageUrls: data.imageUrls } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
        ...(data.openingHours !== undefined ? { openingHours: data.openingHours } : {}),
        ...(data.lastEnrichedAt !== undefined ? { lastEnrichedAt: data.lastEnrichedAt } : {}),
      },
    });
  }

  // Itinerary Operations

  async createItinerary(data: CreateItineraryData): Promise<CreatedItinerary> {
    return prisma.userItinerary.create({
      data: {
        userId: data.userId,
        country: data.country,
        airportCode: data.airportCode,
        numberOfDays: data.numberOfDays,
        budgetUSD: data.budgetUSD,
        travelStyles: data.travelStyles,
        flightDate: data.flightDate || null,
        totalEstimatedCostUSD: data.totalEstimatedCostUSD || null,
        routeSummary: data.routeSummary || null,
      },
    });
  }

  async findItineraryById(id: string): Promise<UserItineraryWithDays | null> {
    const itinerary = await prisma.userItinerary.findUnique({
      where: { id },
      include: {
        days: {
          include: {
            hotel: true,
            items: {
              include: {
                place: true,
              },
              orderBy: { orderInDay: 'asc' },
            },
          },
          orderBy: { dayNumber: 'asc' },
        },
        checklist: true,
      },
    });

    if (!itinerary) return null;

    return itinerary as unknown as UserItineraryWithDays;
  }

  async findUserItineraries(userId: string): Promise<UserItinerarySummary[]> {
    return prisma.userItinerary.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        country: true,
        numberOfDays: true,
        budgetUSD: true,
        travelStyles: true,
        totalEstimatedCostUSD: true,
        createdAt: true,
        updatedAt: true,
        flightDate: true,
      },
    });
  }

  
  // Day & Item Operations
 
  async createItineraryDay(data: CreateItineraryDayData): Promise<ItineraryDayRecord> {
    return prisma.itineraryDay.create({
      data: {
        itineraryId: data.itineraryId,
        dayNumber: data.dayNumber,
        theme: data.theme || 'Mixed',
        description: data.description || null,
        hotelId: data.hotelId || null,
      },
    });
  }

  async createItineraryItem(data: CreateItineraryItemData): Promise<{ id: string }> {
    return prisma.itineraryItem.create({
      data: {
        dayId: data.dayId,
        orderInDay: data.orderInDay,
        placeId: data.placeId,
        itemType: data.itemType,
        notes: data.notes || null,
        suggestedDuration: data.suggestedDuration || null,
      },
      select: { id: true },
    });
  }

  async createChecklistItem(data: CreateChecklistItemData): Promise<{ id: string }> {
    return prisma.checklistItem.create({
      data: {
        itineraryId: data.itineraryId,
        category: data.category,
        item: data.item,
        reason: data.reason || null,
      },
      select: { id: true },
    });
  }

  async createExternalHotel(data: CreateExternalHotelData): Promise<{ id: string }> {
    // Upsert hotel by googlePlaceId to avoid duplicates
    const hotel = await prisma.place.upsert({
      where: { googlePlaceId: data.googlePlaceId },
      update: {
        // Update fields if hotel already exists
        rating: data.rating ?? undefined,
        totalRatings: data.totalRatings ?? undefined,
        imageUrl: data.imageUrl ?? undefined,
        imageUrls: data.imageUrls ?? undefined,
        lastEnrichedAt: new Date(),
      },
      create: {
        name: data.name,
        classification: LocationClassification.MUST_SEE,
        category: LocationCategory.HOTEL,
        description: data.description || `${data.rating ?? 0}★ hotel with ${data.totalRatings ?? 0} reviews`,
        sources: ['google_places'],
        sourceUrls: [],
        popularity: data.totalRatings ?? 0,
        googlePlaceId: data.googlePlaceId,
        rating: data.rating ?? null,
        totalRatings: data.totalRatings ?? null,
        priceLevel: data.priceLevel ?? null,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address ?? null,
        city: data.city ?? data.country,
        country: data.country,
        imageUrl: data.imageUrl ?? null,
        imageUrls: data.imageUrls ?? [],
        activityTypes: ['accommodation'],
        lastEnrichedAt: new Date(),
      },
      select: { id: true },
    });
    
    console.log(`[HOTEL] Saved external hotel "${data.name}" to database with id: ${hotel.id}`);
    return hotel;
  }

  async createPlace(data: CreatePlaceData): Promise<{ id: string }> {
    const place = await prisma.place.upsert({
      where: { googlePlaceId: data.googlePlaceId },
      update: {
        rating: data.rating ?? undefined,
        totalRatings: data.totalRatings ?? undefined,
        imageUrl: data.imageUrl ?? undefined,
        imageUrls: data.imageUrls ?? undefined,
        lastEnrichedAt: new Date(),
      },
      create: {
        name: data.name,
        classification: data.classification || LocationClassification.HIDDEN_GEM,
        category: data.category,
        description: data.description || `${data.rating ?? 0}★ ${data.category.replace('_', ' ')}`,
        sources: ['google_places', 'user_generation'],
        sourceUrls: [],
        popularity: data.totalRatings ?? 0,
        googlePlaceId: data.googlePlaceId,
        rating: data.rating ?? null,
        totalRatings: data.totalRatings ?? null,
        priceLevel: data.priceLevel ?? null,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address ?? null,
        city: data.city ?? data.country,
        country: data.country,
        imageUrl: data.imageUrl ?? null,
        imageUrls: data.imageUrls ?? [],
        activityTypes: ['activity'],
        lastEnrichedAt: new Date(),
      },
      select: { id: true },
    });
    console.log(`[PLACE] Saved new place "${data.name}" to database with id: ${place.id}`);
    return place;
  }
}


export const itineraryProvider = new ItineraryPgProvider();

export { ItineraryPgProvider };
