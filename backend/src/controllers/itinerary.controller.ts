import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getCountriesList, COUNTRIES, getAirportConfig } from '../config/countries.config';
import { GenerateItineraryInput } from '../schemas/itinerary.schema';
import {
  generateItinerary,
  saveItineraryToDb,
  enrichLocations,
  buildItineraryResponse,
  buildItineraryDetailsResponse,
} from '../services/itinerary.service';
import { storeItineraryEmbeddings } from '../services/rag-retrieval.service';
import { parseBudgetLevel, parseTravelStyles } from '../utils/enum-mappers';
import { itineraryProvider } from '../providers/itinerary.provider.pg';

//GET /api/itinerary/countries
//List all supported countries with airports
export async function getCountries(_req: Request, res: Response) {
  try {
    const countries = getCountriesList();
    return res.json({ countries });
  } catch (error: any) {
    console.error('Get countries error:', error);
    return res.status(500).json({ error: 'Failed to get countries', message: error.message });
  }
}

//POST /api/itinerary/generate
//Generate a new itinerary based on parameters
export async function generate(req: Request, res: Response) {
  try {
    const input = req.body as GenerateItineraryInput;
    const userId = (req as AuthenticatedRequest).user?.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required to generate itinerary' });
    }
    
    // Parse enums from validated input
    const budgetLevel = parseBudgetLevel(input.budgetLevel);
    const travelStyles = parseTravelStyles(input.travelStyles || (input.travelStyle ? [input.travelStyle] : undefined));
    
    console.log(`Generating DB-driven itinerary: ${input.cityId}, ${input.numberOfDays} days, styles: ${travelStyles.join(', ')}...`);
    
    //Generate itinerary from database places
    const result = await generateItinerary({
      cityId: input.cityId,
      numberOfDays: input.numberOfDays,
      budgetLevel,
      travelStyles,
      budgetUSD: input.budgetUSD,
      userId: userId,
    });
    
    //Enrich locations with Google Places data, skip if data is already enriched
    await enrichLocations(result.days);
    
    //Get country and airport config
    const countryKey = (input.cityId || 'lebanon').toLowerCase();
    const countryConfig = COUNTRIES[countryKey] || COUNTRIES['lebanon'];
    const airportCode = input.airportCode || countryConfig.airports[0].code;
    const airportConfig = countryConfig.airports.find(a => a.code === airportCode) || countryConfig.airports[0];
    
    //Save to database for RAG
    const savedItinerary = await saveItineraryToDb(
      userId,
      input,
      result,
      countryConfig.name,
      airportCode
    );
    
    console.log(`Saved itinerary to DB with ID: ${savedItinerary.id}`);
    
    //Generate embeddings for RAG (callback, 3mela bas ye5las l itinerary generations)
    setImmediate(() => {
        generateEmbeddingsAsync(savedItinerary.id, countryConfig.name, input, travelStyles.join(', '), result)
            .catch(err => console.error('Background embedding generation failed:', err));
    });
    
    //Build and return response using service helper
    const response = buildItineraryResponse(savedItinerary.id, input, result, countryConfig, airportConfig);
    
    console.log(` Itinerary generated: ${response.days.length} days, ${response.days.reduce((sum: number, d: any) => sum + d.locations.length, 0)} locations`);
    
    return res.json(response);
    
  } catch (error: any) {
    console.error('Generate itinerary error:', error.message);
    return res.status(500).json({ error: 'Failed to generate itinerary', message: error.message });
  }
}

//GET /api/itinerary/user
//List authenticated user's itineraries
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

//GET /api/itinerary/:id
//Get full details of an itinerary
export async function getItineraryDetails(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    // Fetch itinerary from provider
    const itinerary = await itineraryProvider.findItineraryById(id);
    if (!itinerary) {
      return res.status(404).json({ error: 'Itinerary not found' });
    }
    
    // Get airport config using helper
    const { countryConfig, airportConfig } = getAirportConfig(itinerary.country, itinerary.airportCode);
    
    // Build response using service helper
    const response = buildItineraryDetailsResponse(itinerary, countryConfig, airportConfig);
    
    return res.json(response);
    
  } catch (error: any) {
    console.error('Get itinerary error:', error);
    return res.status(500).json({ error: 'Failed to get itinerary', message: error.message });
  }
}


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
