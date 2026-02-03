import prisma from './lib/prisma.js';
import { UpdateLocationInput } from './location-sharing.schema.js';


export async function updateUserLocation(
  userId: string,
  location: UpdateLocationInput
) {
  return prisma.userLocation.upsert({
    where: {
      userId_itineraryId: {
        userId,
        itineraryId: location.itineraryId,
      },
    },
    create: {
      userId,
      itineraryId: location.itineraryId,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      heading: location.heading,
      speed: location.speed,
      lastUpdatedAt: new Date(),
    },
    update: {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      heading: location.heading,
      speed: location.speed,
      lastUpdatedAt: new Date(),
    },
  });
}


export async function getItineraryLocations(itineraryId: string) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  return prisma.userLocation.findMany({
    where: {
      itineraryId,
      lastUpdatedAt: {
        gte: fiveMinutesAgo,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: {
      lastUpdatedAt: 'desc',
    },
  });
}


export async function removeUserLocation(userId: string, itineraryId: string) {
  try {
    await prisma.userLocation.delete({
      where: {
        userId_itineraryId: {
          userId,
          itineraryId,
        },
      },
    });
  } catch (error) {

    console.log(`Location not found for user ${userId} in itinerary ${itineraryId}`);
  }
}


export async function cleanupUserLocations(userId: string) {
  await prisma.userLocation.deleteMany({
    where: { userId },
  });
}


export async function cleanupStaleLocations() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const result = await prisma.userLocation.deleteMany({
    where: {
      lastUpdatedAt: {
        lt: fiveMinutesAgo,
      },
    },
  });

  console.log(`[CLEANUP] Removed ${result.count} stale location records`);
  return result.count;
}
