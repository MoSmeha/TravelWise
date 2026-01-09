/**
 * Itinerary Controller
 * Handles HTTP concerns for itinerary endpoints
 */

import { Request, Response } from 'express';
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
      userId: undefined,
    });
    
    // 2. Enrich locations with Google Places data
    await enrichLocations(result.days);
    
    // 3. Get country info
    const city = await prisma.city.findUnique({ where: { id: input.cityId } });
    const countryName = city ? 'Lebanon' : 'Lebanon'; // MVP simplification
    const airportCode = input.airportCode || 'BEY';
    
    // 4. Save to database for RAG
    const savedItinerary = await saveItineraryToDb(
      undefined,
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

// ============ Helper Functions ============

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
          await prisma.place.update({
            where: { id: location.id },
            data: {
              googlePlaceId: googleData.data.googlePlaceId,
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
