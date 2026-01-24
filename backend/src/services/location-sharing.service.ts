import prisma from '../lib/prisma.js';
import { UpdateLocationInput } from '../schemas/location-sharing.schema.js';

/**
 * Update or create user location for an itinerary
 */
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

/**
 * Get all active user locations for an itinerary (updated within last 5 minutes)
 */
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

/**
 * Remove user's location from a specific itinerary
 */
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
    // Ignore if location doesn't exist
    console.log(`Location not found for user ${userId} in itinerary ${itineraryId}`);
  }
}

/**
 * Clean up all locations for a user (called when they disconnect)
 */
export async function cleanupUserLocations(userId: string) {
  await prisma.userLocation.deleteMany({
    where: { userId },
  });
}

/**
 * Clean up stale locations (older than 5 minutes)
 * Should be called periodically
 */
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
