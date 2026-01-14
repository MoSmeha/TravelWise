/**
 * Itinerary Controller
 * Handles HTTP concerns for itinerary endpoints
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getCountriesList, COUNTRIES } from '../config/countries.config';
import { GenerateItineraryInput } from '../schemas/itinerary.schema';
import { enrichPlaceWithGoogleData } from '../services/google-places.service';
import { generateItinerary, saveItineraryToDb } from '../services/itinerary.service';
import { storeItineraryEmbeddings } from '../services/rag-retrieval.service';
import { parseBudgetLevel, parseTravelStyles } from '../utils/enum-mappers';
import { itineraryProvider } from '../providers/itinerary.provider.pg';

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
    // Support both new array format (travelStyles) and legacy single value (travelStyle)
    const travelStyles = parseTravelStyles(input.travelStyles || (input.travelStyle ? [input.travelStyle] : undefined));
    
    console.log(`🗺️ Generating DB-driven itinerary: ${input.cityId}, ${input.numberOfDays} days, styles: ${travelStyles.join(', ')}...`);
    
    // 1. Generate itinerary from database places
    const result = await generateItinerary({
      cityId: input.cityId,
      numberOfDays: input.numberOfDays,
      budgetLevel,
      travelStyles,
      budgetUSD: input.budgetUSD,
      userId: userId,
    });
    
    // 2. Enrich locations with Google Places data
    await enrichLocations(result.days);
    
    // 3. Get country info (MVP: Lebanon only, but using config)
    const countryConfig = COUNTRIES['lebanon'];
    const countryName = countryConfig.name;
    const airportCode = input.airportCode || countryConfig.airports[0].code;
    const airportConfig = countryConfig.airports.find(a => a.code === airportCode) || countryConfig.airports[0];
    
    // 4. Save to database for RAG
    const savedItinerary = await saveItineraryToDb(
      userId,
      input,
      result,
      countryName,
      airportCode
    );
    
    console.log(`Saved itinerary to DB with ID: ${savedItinerary.id}`);
    
    // 5. Generate embeddings for RAG (non-blocking)
    // Wrap in setImmediate to ensure it runs on next tick and doesn't block response
    setImmediate(() => {
        generateEmbeddingsAsync(savedItinerary.id, countryName, input, travelStyles.join(', '), result)
            .catch(err => console.error('Background embedding generation failed:', err));
    });
    
    // 6. Build and return response
    console.log('Building itinerary response...');
    const response = buildItineraryResponse(savedItinerary.id, input, result, countryConfig, airportConfig);
    console.log('Response built successfully.');
    
    console.log(` Itinerary generated: ${response.days.length} days, ${response.days.reduce((sum: number, d: any) => sum + d.locations.length, 0)} locations`);
    
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
    const itineraries = await itineraryProvider.findUserItineraries(userId);

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
    
    // Fetch full itinerary with relations using provider
    const itinerary = await itineraryProvider.findItineraryById(id);

    if (!itinerary) {
        return res.status(404).json({ error: 'Itinerary not found' });
    }
    
    // Look up airport from config using saved airportCode
    const countryKey = itinerary.country.toLowerCase();
    const countryConfig = COUNTRIES[countryKey];
    const airportConfig = countryConfig?.airports.find(a => a.code === itinerary.airportCode) 
      || countryConfig?.airports[0];
    
    // Build response from ItineraryDay structure
    const days = itinerary.days.map(day => {
        // Separate items by type
        const activities = day.items.filter(i => i.itemType === 'ACTIVITY');
        const meals = {
            breakfast: day.items.find(i => i.itemType === 'BREAKFAST')?.place || null,
            lunch: day.items.find(i => i.itemType === 'LUNCH')?.place || null,
            dinner: day.items.find(i => i.itemType === 'DINNER')?.place || null,
        };
        
        // Map activity items to locations
        const locations = activities.map(item => ({
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
            crowdLevel: 'MODERATE'
        }));
        
        return {
            id: day.id,
            dayNumber: day.dayNumber,
            theme: day.theme,
            description: day.description || `Day ${day.dayNumber}`,
            locations,
            meals: {
                breakfast: meals.breakfast ? { id: meals.breakfast.id, name: meals.breakfast.name, category: meals.breakfast.category } : null,
                lunch: meals.lunch ? { id: meals.lunch.id, name: meals.lunch.name, category: meals.lunch.category } : null,
                dinner: meals.dinner ? { id: meals.dinner.id, name: meals.dinner.name, category: meals.dinner.category } : null,
            },
            hotel: day.hotel ? {
                id: day.hotel.id,
                name: day.hotel.name,
                category: day.hotel.category,
                latitude: day.hotel.latitude,
                longitude: day.hotel.longitude,
                imageUrl: day.hotel.imageUrl,
            } : null,
        };
    });
    
    const response = {
        source: 'DATABASE',
        itinerary: {
            id: itinerary.id,
            numberOfDays: itinerary.numberOfDays,
            budgetUSD: itinerary.budgetUSD,
            totalEstimatedCostUSD: itinerary.totalEstimatedCostUSD,
            travelStyles: itinerary.travelStyles,
        },
        days,
        airport: airportConfig ? {
          name: airportConfig.name,
          code: airportConfig.code,
          latitude: airportConfig.latitude,
          longitude: airportConfig.longitude,
        } : {
          name: `${itinerary.country} Airport`,
          code: itinerary.airportCode,
          latitude: 0, 
          longitude: 0,
        },
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
interface DayLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  // allow other properties
  [key: string]: any;
}

interface DayWithLocations {
  locations: DayLocation[];
  [key: string]: any;
}

async function enrichLocations(days: DayWithLocations[]) {
  console.log(`📸 Enriching ${days.reduce((sum: number, d) => sum + d.locations.length, 0)} locations with Google Places data...`);
  
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
          const existingPlace = await itineraryProvider.findPlaceByGoogleId(googleData.data.googlePlaceId);

          // Only update googlePlaceId if it doesn't exist or belongs to this place
          const shouldUpdateId = !existingPlace || existingPlace.id === location.id;

          await itineraryProvider.updatePlaceEnrichment(location.id, {
            ...(shouldUpdateId ? { googlePlaceId: googleData.data.googlePlaceId } : {}),
            rating: googleData.data.rating,
            totalRatings: googleData.data.totalRatings,
            topReviews: googleData.data.topReviews as any,
            imageUrls: googleData.data.photos,
            imageUrl: googleData.data.photos[0] || undefined, // Set first photo as primary image
            openingHours: googleData.data.openingHours as any,
            lastEnrichedAt: new Date(),
          });
          
          // Attach to location object for embedding generation
          location.rating = googleData.data.rating;
          location.totalRatings = googleData.data.totalRatings;
          location.topReviews = googleData.data.topReviews;
          location.openingHours = googleData.data.openingHours;
        }
      } catch (error: any) {
        if (error.code === 'P2002') {
          console.log(` Place "${location.name}" already has Google Place ID attached.`);
          continue;
        }
        console.warn(` Failed to enrich "${location.name}":`, error.message);
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
    console.log(` Embeddings generated for RAG`);
  } catch (embeddingError: any) {
    console.error('Failed to generate embeddings (non-critical):', embeddingError.message);
  }
}

/**
 * Build the itinerary response object
 */
function buildItineraryResponse(
  itineraryId: string, 
  input: GenerateItineraryInput, 
  result: any,
  countryConfig: any,
  airportConfig: any
) {
  const totalCost = result.totalEstimatedCostUSD || input.budgetUSD;
  
  // Helper to map a place to response format
  const mapPlace = (loc: any, idx: number, dayNum: number) => loc ? {
    id: loc.id || `loc-${dayNum}-${idx}`,
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
    rating: loc.rating,
    totalRatings: loc.totalRatings,
    imageUrl: loc.imageUrl,
    imageUrls: loc.imageUrls,
    scamWarning: loc.scamWarning,
  } : null;
  
  const daysWithIds = result.days.map((d: any) => ({
    id: `day-${d.dayNumber}`,
    dayNumber: d.dayNumber,
    description: d.description,
    theme: d.theme,
    locations: d.locations.map((loc: any, idx: number) => mapPlace(loc, idx, d.dayNumber)),
    meals: d.meals ? {
      breakfast: mapPlace(d.meals.breakfast, 0, d.dayNumber),
      lunch: mapPlace(d.meals.lunch, 1, d.dayNumber),
      dinner: mapPlace(d.meals.dinner, 2, d.dayNumber),
    } : null,
    hotel: d.hotel ? mapPlace(d.hotel, 0, d.dayNumber) : null,
    routeDescription: d.routeDescription,
  }));
  
  // Map primary hotel
  const hotel = result.hotel ? {
    id: result.hotel.id,
    name: result.hotel.name,
    category: result.hotel.category,
    latitude: result.hotel.latitude,
    longitude: result.hotel.longitude,
    rating: result.hotel.rating,
    imageUrl: result.hotel.imageUrl,
    address: result.hotel.address,
  } : null;
  
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
    hotel,
    airport: {
      name: airportConfig.name,
      code: airportConfig.code,
      latitude: airportConfig.latitude,
      longitude: airportConfig.longitude,
    },
    country: {
      id: countryConfig.key,
      name: countryConfig.name,
      code: countryConfig.code,
      currency: countryConfig.currency,
    },
    warnings: result.warnings.map((w: any, idx: number) => ({ id: `warn-${idx}`, ...w })),
    touristTraps: result.touristTraps.map((t: any, idx: number) => ({ id: `trap-${idx}`, ...t })),
    localTips: result.localTips,
    routeSummary: result.routeSummary || '',
  };
}
