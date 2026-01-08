import { BudgetLevel, TravelStyle } from '@prisma/client';
import express from 'express';
import { z } from 'zod';
import { getCountriesList } from '../config/countries.config';
import prisma from '../lib/prisma';
import { enrichPlaceWithGoogleData } from '../services/google-places.service';
import { generateItinerary, saveItineraryToDb } from '../services/itinerary.service';
import { askAboutItinerary, storeItineraryEmbeddings } from '../services/rag-retrieval.service';

const router = express.Router();

// Request schema - adapted to match frontend
const generateSchema = z.object({
  cityId: z.string(), // Used as country key (e.g., 'lebanon')
  airportCode: z.string().optional(),
  numberOfDays: z.number().min(1).max(30),
  budgetLevel: z.string().optional(), // LOW, MEDIUM, HIGH - optional
  travelStyle: z.string().optional(), // NATURE, FOOD, etc - optional
  budgetUSD: z.number().optional().default(1000),
  startDate: z.string().optional(),
});

// GET /api/itinerary/countries - Get list of supported countries with airports
router.get('/countries', (_req, res) => {
  try {
    const countries = getCountriesList();
    return res.json({ countries });
  } catch (error: any) {
    console.error('Get countries error:', error);
    return res.status(500).json({ error: 'Failed to get countries', message: error.message });
  }
});

// POST /api/itinerary/generate - Generate database-driven itinerary
router.post('/generate', async (req, res) => {
  try {
    const input = generateSchema.parse(req.body);
    
    // Map budgetLevel string to enum
    const budgetLevelMap: Record<string, BudgetLevel> = {
      'LOW': BudgetLevel.LOW,
      'MEDIUM': BudgetLevel.MEDIUM,
      'HIGH': BudgetLevel.HIGH,
    };
    const budgetLevel = budgetLevelMap[input.budgetLevel || 'MEDIUM'] || BudgetLevel.MEDIUM;
    
    // Map travelStyle string to enum
    const travelStyleMap: Record<string, TravelStyle> = {
      'NATURE': TravelStyle.NATURE,
      'FOOD': TravelStyle.FOOD,
      'CULTURE': TravelStyle.CULTURE,
      'NIGHTLIFE': TravelStyle.NIGHTLIFE,
      'MIXED': TravelStyle.MIXED,
    };
    const travelStyle = travelStyleMap[input.travelStyle || 'MIXED'] || TravelStyle.MIXED;
    
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
    console.log(`📸 Enriching ${result.days.reduce((sum, d) => sum + d.locations.length, 0)} locations with Google Places data...`);
    
    for (const day of result.days) {
      for (const location of day.locations) {
        try {
          const googleData = await enrichPlaceWithGoogleData(
            location.name,
            location.latitude,
            location.longitude
          );
          
          if (googleData.data) {
            // Update Place in database with Google data
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
          // Ignore unique constraint violations (place likely already enriched/updated by parallel process)
          if (error.code === 'P2002') {
             console.log(`ℹ️ Place "${location.name}" already has Google Place ID attached.`);
             continue; 
          }
          console.warn(`⚠️ Failed to enrich "${location.name}":`, error.message);
          // Continue with other locations
        }
      }
    }
    
    // 3. Fetch country info (simplified for MVP)
    const city = await prisma.city.findUnique({ where: { id: input.cityId } });
    const countryName = city ? 'Lebanon' : 'Lebanon'; // MVP simplification
    const airportCode = input.airportCode || 'BEY';
    
    // 4. Save to database for RAG
    const savedItinerary = await saveItineraryToDb(
      undefined, // userId
      input,
      result,
      countryName,
      airportCode
    );
    
    console.log(`💾 Saved itinerary to DB with ID: ${savedItinerary.id}`);
    
    // 4. Generate embeddings for RAG
    try {
      // Construct itinerary data for embedding
      const itineraryData = {
        id: savedItinerary.id, // Correct property name matching ItineraryData interface
        country: countryName,
        numberOfDays: input.numberOfDays,
        budgetUSD: input.budgetUSD,
        travelStyles: [travelStyle],
        days: result.days.map(d => ({
          dayNumber: d.dayNumber,
          theme: d.description || `Day ${d.dayNumber}`,
          places: d.locations.map(loc => ({
            place: {
              id: loc.id,
              name: loc.name,
              classification: loc.classification,
              category: loc.category,
              description: loc.description || '',
              activityTypes: [loc.category],
              costMinUSD: loc.costMinUSD,
              costMaxUSD: loc.costMaxUSD,
              rating: (loc as any).rating,
              totalRatings: (loc as any).totalRatings,
              topReviews: (loc as any).topReviews,
              openingHours: (loc as any).openingHours,
            }
          })),
        })),
      };
      
      await storeItineraryEmbeddings(itineraryData as any);
      console.log(`✅ Embeddings generated for RAG`);
    } catch (embeddingError: any) {
      console.error('Failed to generate embeddings (non-critical):', embeddingError.message);
      // Continue without embeddings - RAG will just not work for this itinerary
    }
    
    // 5. Construct response with IDs for React keys
    const totalCost = result.totalEstimatedCostUSD || input.budgetUSD;
    
    const daysWithIds = result.days.map(d => ({
      id: `day-${d.dayNumber}`,
      dayNumber: d.dayNumber,
      description: d.description,
      locations: d.locations.map((loc, idx) => ({
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
    
    console.log(`✅ Itinerary generated: ${daysWithIds.length} days, ${daysWithIds.reduce((sum, d) => sum + d.locations.length, 0)} locations`);
    
    return res.json({
      source: 'DATABASE',
      itinerary: {
        id: savedItinerary.id, // Real DB ID for RAG
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
      hotels: [], // Hotels can be added later
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
      warnings: result.warnings.map((w, idx) => ({ id: `warn-${idx}`, ...w })),
      touristTraps: result.touristTraps.map((t, idx) => ({ id: `trap-${idx}`, ...t })),
      localTips: result.localTips,
      routeSummary: result.routeSummary || '',
    });
    
  } catch (error: any) {
    console.error('Generate itinerary error:', error.message);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    
    return res.status(500).json({ error: 'Failed to generate itinerary', message: error.message });
  }
});

// POST /api/itinerary/:id/ask - RAG Q&A endpoint
router.post('/:id/ask', async (req, res) => {
  try {
    const { id } = req.params;
    const { question } = req.body;
    
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }
    
    console.log(`🤖 RAG Q&A for itinerary ${id}: "${question}"`);
    
    const result = await askAboutItinerary(question, id);
    
    return res.json(result);
  } catch (error: any) {
    console.error('RAG Q&A error:', error);
    return res.status(500).json({ error: 'Failed to get answer', message: error.message });
  }
});

export default router;
