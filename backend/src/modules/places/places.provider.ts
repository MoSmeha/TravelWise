import prisma from '../shared/lib/prisma.js';
import {
  CategoryCount,
  CityCount,
  CreatePlaceData,
  IPlacesProvider,
  PaginatedPlaces,
  PlaceEnrichmentData,
  PlaceFilters,
  PlaceRecord,
} from './places.contract.js';

class PlacesPgProvider implements IPlacesProvider {


  async findByName(name: string): Promise<PlaceRecord | null> {
    return prisma.place.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
      },
    });
  }

  async findByGooglePlaceId(googlePlaceId: string): Promise<PlaceRecord | null> {
    return prisma.place.findUnique({
      where: { googlePlaceId },
    });
  }

  async findById(id: string): Promise<PlaceRecord | null> {
    return prisma.place.findUnique({
      where: { id },
    });
  }

  async findMany(filters: PlaceFilters): Promise<PaginatedPlaces> {
    const where: any = {};

    if (filters.city) where.city = filters.city;
    if (filters.category) where.category = filters.category;
    if (filters.classification) where.classification = filters.classification;
    if (filters.activityType) where.activityTypes = { has: filters.activityType };

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    const [places, total] = await Promise.all([
      prisma.place.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: [
          { popularity: 'desc' },
          { rating: 'desc' },
        ],
      }),
      prisma.place.count({ where }),
    ]);

    return {
      data: places,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + places.length < total,
      },
    };
  }

  async groupByCity(): Promise<CityCount[]> {
    const cities = await prisma.place.groupBy({
      by: ['city'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return cities.map((c) => ({
      name: c.city,
      placeCount: c._count.id,
    }));
  }

  async groupByCategory(): Promise<CategoryCount[]> {
    const categories = await prisma.place.groupBy({
      by: ['category'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return categories.map((c) => ({
      name: c.category,
      placeCount: c._count.id,
    }));
  }



  async create(data: CreatePlaceData): Promise<PlaceRecord> {
    return prisma.place.create({
      data: {
        name: data.name,
        description: data.description,
        classification: data.classification,
        category: data.category,
        googlePlaceId: data.googlePlaceId,
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
        city: data.city,
        rating: data.rating,
        totalRatings: data.totalRatings,
        priceLevel: data.priceLevel,
        openingHours: data.openingHours,
        topReviews: data.topReviews || [],
        sources: data.sources || ['google'],
        sourceUrls: data.sourceUrls || [],
        activityTypes: data.activityTypes || [],
      },
    });
  }

  async updateEnrichment(id: string, data: PlaceEnrichmentData): Promise<void> {
    await prisma.place.update({
      where: { id },
      data: {
        ...(data.googlePlaceId !== undefined ? { googlePlaceId: data.googlePlaceId } : {}),
        ...(data.rating !== undefined ? { rating: data.rating } : {}),
        ...(data.totalRatings !== undefined ? { totalRatings: data.totalRatings } : {}),
        ...(data.priceLevel !== undefined ? { priceLevel: data.priceLevel } : {}),
        ...(data.topReviews !== undefined ? { topReviews: data.topReviews } : {}),
        ...(data.imageUrls !== undefined ? { imageUrls: data.imageUrls } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
        ...(data.openingHours !== undefined ? { openingHours: data.openingHours } : {}),
        ...(data.lastEnrichedAt !== undefined ? { lastEnrichedAt: data.lastEnrichedAt } : {}),
      },
    });
  }
}

export const placesProvider = new PlacesPgProvider();

export { PlacesPgProvider };
