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
  CreateWarningData,
  CreateTouristTrapData,
  CreateLocalTipData,
  FetchPlacesParams,
  IItineraryProvider,
  ItineraryDayRecord,
  PlaceRecord,
  UpdatePlaceEnrichmentData,
  UserItinerarySummary,
  UserItineraryWithDays,
} from '../provider-contract/itinerary.provider-contract.js';


class ItineraryPgProvider implements IItineraryProvider {


  // Pure data access - fetches places from database with basic filtering
  async fetchPlacesRaw(params: FetchPlacesParams): Promise<PlaceRecord[]> {
    const { categories, country, city, limit, excludeIds = [], priceLevel, excludeTouristTraps } = params;

    const where: any = {
      category: { in: categories },
      country: { equals: country, mode: 'insensitive' },
    };

    if (excludeTouristTraps) {
      where.classification = { not: LocationClassification.TOURIST_TRAP };
    }

    if (city) {
      where.city = { equals: city, mode: 'insensitive' };
    }

    if (priceLevel) {
      where.priceLevel = priceLevel;
    }

    if (excludeIds.length > 0) {
      where.id = { notIn: excludeIds };
    }

    const places = await prisma.place.findMany({
      where,
      orderBy: [
        { rating: 'desc' },
        { popularity: 'desc' },
      ],
      take: limit,
    });

    return places as PlaceRecord[];
  }

  // For backwards compatibility - delegates to service wrapper
  async fetchPlaces(params: FetchPlacesParams): Promise<PlaceRecord[]> {
    return this.fetchPlacesRaw(params);
  }

  async findPlaceByGoogleId(googlePlaceId: string): Promise<{ id: string } | null> {
    return prisma.place.findUnique({
      where: { googlePlaceId },
      select: { id: true },
    });
  }

  async findPlacesByName(name: string, country: string): Promise<PlaceRecord[]> {
    // Search for places matching the name (case-insensitive, partial match)
    const places = await prisma.place.findMany({
      where: {
        name: { contains: name, mode: 'insensitive' },
        country: { equals: country, mode: 'insensitive' },
      },
      take: 5,
      orderBy: { rating: 'desc' },
    });
    return places as PlaceRecord[];
  }

  async fetchTouristTraps(country: string): Promise<PlaceRecord[]> {
    const places = await prisma.place.findMany({
      where: {
        country: { equals: country, mode: 'insensitive' },
        classification: LocationClassification.TOURIST_TRAP,
      },
      take: 20,
    });
    return places as PlaceRecord[];
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
        warnings: true,
        touristTraps: true,
        localTips: true,
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
    const hotel = await prisma.place.upsert({
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
        classification: data.classification,
        category: LocationCategory.HOTEL,
        description: data.description,
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
        classification: data.classification,
        category: data.category,
        description: data.description,
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
    return place;
  }

  async deleteItinerary(id: string): Promise<void> {
    await prisma.userItinerary.delete({
      where: { id },
    });
  }

  async createWarning(data: CreateWarningData): Promise<{ id: string }> {
    return prisma.itineraryWarning.create({
      data: {
        itineraryId: data.itineraryId,
        title: data.title,
        description: data.description,
      },
      select: { id: true },
    });
  }

  async createTouristTrap(data: CreateTouristTrapData): Promise<{ id: string }> {
    return prisma.itineraryTouristTrap.create({
      data: {
        itineraryId: data.itineraryId,
        name: data.name,
        reason: data.reason,
      },
      select: { id: true },
    });
  }

  async createLocalTip(data: CreateLocalTipData): Promise<{ id: string }> {
    return prisma.itineraryLocalTip.create({
      data: {
        itineraryId: data.itineraryId,
        tip: data.tip,
      },
      select: { id: true },
    });
  }
}


export const itineraryProvider = new ItineraryPgProvider();

export { ItineraryPgProvider };
