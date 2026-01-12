/**
 * Itinerary Controller
 * Handles HTTP concerns for itinerary endpoints
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getCountriesList } from '../config/countries.config';
import prisma from '../lib/prisma';
import { GenerateItineraryInput } from '../schemas/itinerary.schema';
import { enrichPlaceWithGoogleData } from '../services/google-places.service';
import { generateItinerary, saveItineraryToDb } from '../services/itinerary.service';
import { storeItineraryEmbeddings } from '../services/rag-retrieval.service';
import { parseBudgetLevel, parseTravelStyle } from '../utils/enum-mappers';

/**
 * GET /api/itinerary/countries
 * List all supported countries with airports
 */
export async function getCountries(_req: Request, res: Response) {
  try {
    const countries = getCountriesList();
    return res.json({ countries });
  } catch (error: any) {
    console.error('Get countries error:', error);
    return res.status(500).json({ error: 'Failed to get countries', message: error.message });
  }
}

/**
 * POST /api/itinerary/generate
 * Generate a new itinerary based on parameters
 */
export async function generate(req: Request, res: Response) {
  try {
    const input = req.body as GenerateItineraryInput;
    const userId = (req as AuthenticatedRequest).user?.userId;
    
    // Authentication is required for generating itineraries
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to generate itinerary' });
    }
    
    // Parse enums from validated input
    const budgetLevel = parseBudgetLevel(input.budgetLevel);
    const travelStyle = parseTravelStyle(input.travelStyle);
    
    console.log(`🗺️ Generating DB-driven itinerary: ${input.cityId}, ${input.numberOfDays} days, ${travelStyle} style...`);
    
    // 1. Generate itinerary from database places
    const result = await generateItinerary({
      cityId: input.cityId,
      numberOfDays: input.numberOfDays,
      budgetLevel,
      travelStyle,
      budgetUSD: input.budgetUSD,
      userId: userId,
    });
    
    // 2. Enrich locations with Google Places data
    await enrichLocations(result.days);
    
    // 3. Get country info
    const city = await prisma.city.findUnique({ where: { id: input.cityId } });
    const countryName = city ? 'Lebanon' : 'Lebanon'; // MVP simplification
    const airportCode = input.airportCode || 'BEY';
    
    // 4. Save to database for RAG
    const savedItinerary = await saveItineraryToDb(
      userId,
      input,
      result,
      countryName,
      airportCode
    );
    
    console.log(`💾 Saved itinerary to DB with ID: ${savedItinerary.id}`);
    
    // 5. Generate embeddings for RAG (non-blocking)
    generateEmbeddingsAsync(savedItinerary.id, countryName, input, travelStyle, result);
    
    // 6. Build and return response
    const response = buildItineraryResponse(savedItinerary.id, input, result);
    
    console.log(`✅ Itinerary generated: ${response.days.length} days, ${response.days.reduce((sum: number, d: any) => sum + d.locations.length, 0)} locations`);
    
    return res.json(response);
    
  } catch (error: any) {
    console.error('Generate itinerary error:', error.message);
    return res.status(500).json({ error: 'Failed to generate itinerary', message: error.message });
  }
}

/**
 * GET /api/itinerary/user
 * List authenticated user's itineraries
 */
export async function listUserItineraries(req: Request, res: Response) {
  try {
    const userId = (req as AuthenticatedRequest).user!.userId;
    const itineraries = await prisma.userItinerary.findMany({
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
      }
    });

    return res.json(itineraries);
  } catch (error: any) {
    console.error('List user itineraries error:', error);
    return res.status(500).json({ error: 'Failed to list itineraries', message: error.message });
  }
}

/**
 * GET /api/itinerary/:id
 * Get full details of an itinerary
 */
export async function getItineraryDetails(req: Request, res: Response) {
  try {
    const { id } = req.params;
    // Note: Ownership is verified by requireOwnership middleware before this function
    
    // Fetch full itinerary with relations
    const itinerary = await prisma.userItinerary.findUnique({
        where: { id },
        include: {
            items: {
                include: {
                    place: true
                },
                orderBy: [
                    { dayNumber: 'asc' },
                    { orderInDay: 'asc' }
                ]
            },
            checklist: true
        }
    });

    if (!itinerary) {
        return res.status(404).json({ error: 'Itinerary not found' });
    }

    // Access control:
    // If user is logged in, they can access their own itineraries
    // If itinerary has no user (anonymous), anyone can access (for sharing)
    // If itinerary belongs to another user... maybe restrict? For now allow if they have ID (sharing feature)
    
    // Reconstruct the response format expected by frontend
    // We need to map DB structure back to 'ItineraryResult' shape roughly
    // Or at least the shape frontend expects in map.tsx
    
    const daysMap = new Map<number, any>();
    
    for (const item of itinerary.items) {
        if (!daysMap.has(item.dayNumber)) {
            daysMap.set(item.dayNumber, {
                dayNumber: item.dayNumber,
                description: `Day ${item.dayNumber}`, // storing description on Day level would be better in DB model update, but we can infer
                locations: []
            });
        }
        
        const day = daysMap.get(item.dayNumber);
        
        // Map DB Place to API Location
        day.locations.push({
            id: item.place.id,
            name: item.place.name,
            classification: item.place.classification,
            category: item.place.category,
            description: item.notes || item.place.description,
            latitude: item.place.latitude,
            longitude: item.place.longitude,
            costMinUSD: item.place.costMinUSD,
            costMaxUSD: item.place.costMaxUSD,
            rating: item.place.rating,
            totalRatings: item.place.totalRatings,
            topReviews: item.place.topReviews,
            imageUrls: item.place.imageUrls,
            imageUrl: item.place.imageUrl,
            scamWarning: item.place.scamWarning,
            bestTimeToVisit: item.place.bestTimeToVisit,
            crowdLevel: 'MODERATE' // default if missing
        });
    }
    
    const days = Array.from(daysMap.values());
    
    const response = {
        source: 'DATABASE',
        itinerary: {
            id: itinerary.id,
            numberOfDays: itinerary.numberOfDays,
            budgetUSD: itinerary.budgetUSD,
            totalEstimatedCostUSD: itinerary.totalEstimatedCostUSD,
            travelStyles: itinerary.travelStyles,
        },
        days: days,
        airport: { // Minimal airport info if not stored
          name: `${itinerary.country} Airport`,
          code: itinerary.airportCode,
          latitude: 0, 
          longitude: 0,
        },
        // We need to re-fetch/store warnings/tips or regenerate them. 
        // For now return empty or store them in DB.
        warnings: [], 
        touristTraps: [],
        localTips: [],
        routeSummary: itinerary.routeSummary
    };
    
    return res.json(response);

  } catch (error: any) {
    console.error('Get itinerary error:', error);
    return res.status(500).json({ error: 'Failed to get itinerary', message: error.message });
  }
}

/**
 * Enrich locations with Google Places data
 */
async function enrichLocations(days: any[]) {
  console.log(`📸 Enriching ${days.reduce((sum: number, d: any) => sum + d.locations.length, 0)} locations with Google Places data...`);
  
  for (const day of days) {
    for (const location of day.locations) {
      try {
        const googleData = await enrichPlaceWithGoogleData(
          location.name,
          location.latitude,
          location.longitude
        );
        
        if (googleData.data) {
          // Check if another place already has this googlePlaceId to avoid unique constraint violations
          const existingPlace = await prisma.place.findUnique({
            where: { googlePlaceId: googleData.data.googlePlaceId },
            select: { id: true }
          });

          // Only update googlePlaceId if it doesn't exist or belongs to this place
          const shouldUpdateId = !existingPlace || existingPlace.id === location.id;

          await prisma.place.update({
            where: { id: location.id },
            data: {
              ...(shouldUpdateId ? { googlePlaceId: googleData.data.googlePlaceId } : {}),
              rating: googleData.data.rating,
              totalRatings: googleData.data.totalRatings,
              topReviews: googleData.data.topReviews as any,
              imageUrls: googleData.data.photos,
              openingHours: googleData.data.openingHours as any,
              lastEnrichedAt: new Date(),
            },
          });
          
          // Attach to location object for embedding generation
          (location as any).rating = googleData.data.rating;
          (location as any).totalRatings = googleData.data.totalRatings;
          (location as any).topReviews = googleData.data.topReviews;
          (location as any).openingHours = googleData.data.openingHours;
        }
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(`ℹ️ Place "${location.name}" already has Google Place ID attached.`);
          continue;
        }
        console.warn(`⚠️ Failed to enrich "${location.name}":`, error.message);
      }
    }
  }
}

/**
 * Generate embeddings asynchronously (non-blocking)
 */
async function generateEmbeddingsAsync(
  itineraryId: string,
  countryName: string,
  input: GenerateItineraryInput,
  travelStyle: string,
  result: any
) {
  try {
    const itineraryData = {
      id: itineraryId,
      country: countryName,
      numberOfDays: input.numberOfDays,
      budgetUSD: input.budgetUSD,
      travelStyles: [travelStyle],
      days: result.days.map((d: any) => ({
        dayNumber: d.dayNumber,
        theme: d.description || `Day ${d.dayNumber}`,
        places: d.locations.map((loc: any) => ({
          place: {
            id: loc.id,
            name: loc.name,
            classification: loc.classification,
            category: loc.category,
            description: loc.description || '',
            activityTypes: [loc.category],
            costMinUSD: loc.costMinUSD,
            costMaxUSD: loc.costMaxUSD,
            rating: loc.rating,
            totalRatings: loc.totalRatings,
            topReviews: loc.topReviews,
            openingHours: loc.openingHours,
          }
        })),
      })),
    };
    
    await storeItineraryEmbeddings(itineraryData as any);
    console.log(`✅ Embeddings generated for RAG`);
  } catch (embeddingError: any) {
    console.error('Failed to generate embeddings (non-critical):', embeddingError.message);
  }
}

/**
 * Build the itinerary response object
 */
function buildItineraryResponse(itineraryId: string, input: GenerateItineraryInput, result: any) {
  const totalCost = result.totalEstimatedCostUSD || input.budgetUSD;
  
  const daysWithIds = result.days.map((d: any) => ({
    id: `day-${d.dayNumber}`,
    dayNumber: d.dayNumber,
    description: d.description,
    locations: d.locations.map((loc: any, idx: number) => ({
      id: loc.id || `loc-${d.dayNumber}-${idx}`,
      name: loc.name,
      classification: loc.classification,
      category: loc.category,
      description: loc.description || '',
      costMinUSD: loc.costMinUSD,
      costMaxUSD: loc.costMaxUSD,
      crowdLevel: loc.crowdLevel,
      bestTimeToVisit: loc.bestTimeToVisit,
      latitude: loc.latitude,
      longitude: loc.longitude,
      reasoning: loc.reasoning,
      scamWarning: loc.scamWarning,
      travelTimeFromPrevious: loc.travelTimeFromPrevious,
    })),
    routeDescription: d.routeDescription,
  }));
  
  return {
    source: 'DATABASE',
    itinerary: {
      id: itineraryId,
      numberOfDays: input.numberOfDays,
      budgetUSD: input.budgetUSD,
      totalEstimatedCostUSD: totalCost,
      budgetBreakdown: {
        food: Math.round(totalCost * 0.3),
        activities: Math.round(totalCost * 0.2),
        transport: Math.round(totalCost * 0.1),
        accommodation: Math.round(totalCost * 0.4),
      },
    },
    days: daysWithIds,
    hotels: [],
    airport: {
      name: 'Beirut-Rafic Hariri International Airport',
      code: 'BEY',
      latitude: 33.8209,
      longitude: 35.4913,
    },
    country: {
      id: 'lebanon',
      name: 'Lebanon',
      code: 'LB',
      currency: 'LBP',
    },
    warnings: result.warnings.map((w: any, idx: number) => ({ id: `warn-${idx}`, ...w })),
    touristTraps: result.touristTraps.map((t: any, idx: number) => ({ id: `trap-${idx}`, ...t })),
    localTips: result.localTips,
    routeSummary: result.routeSummary || '',
  };
}
