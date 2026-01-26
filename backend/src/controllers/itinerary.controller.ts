import { Request, Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  getCountriesList,
  COUNTRIES,
  getAirportConfig,
} from "../config/countries.config.js";
import { GenerateItineraryInput } from "../schemas/itinerary.schema.js";
import {
  generateItinerary,
  saveItineraryToDb,
  enrichLocations,
  buildItineraryResponse,
  buildItineraryDetailsResponse,
} from "../services/itinerary.service.js";
import { storeItineraryEmbeddings } from "../services/rag-retrieval.service.js";
import { parseBudgetLevel, parseTravelStyles } from "../utils/enum-mappers.js";
import { itineraryProvider } from "../providers/itinerary.provider.pg.js";


export async function getCountries(_req: Request, res: Response) {
  try {
    const countries = getCountriesList();
    return res.json({ countries });
  } catch (error: any) {
    console.error("Get countries error:", error);
    return res
      .status(500)
      .json({ error: "Failed to get countries", message: error.message });
  }
}


export async function generate(req: Request, res: Response) {
  try {
    const input = req.body as GenerateItineraryInput;
    const userId = (req as AuthenticatedRequest).user?.userId;

    if (!userId) {
      return res
        .status(401)
        .json({ error: "Authentication required to generate itinerary" });
    }


    const budgetLevel = parseBudgetLevel(input.budgetLevel);
    const travelStyles = parseTravelStyles(
      input.travelStyles ||
        ((input as any).travelStyle ? [(input as any).travelStyle] : undefined)
    );

    console.log(
      `Generating DB-driven itinerary: ${input.cityId}, ${
        input.numberOfDays
      } days, styles: ${travelStyles.join(", ")}...`
    );


    const result = await generateItinerary({
      cityId: input.cityId,
      numberOfDays: input.numberOfDays,
      budgetLevel,
      travelStyles,
      budgetUSD: input.budgetUSD,
      userId: userId,
    });


    await enrichLocations(result.days);


    const countryKey = (input.cityId || "lebanon").toLowerCase();
    const countryConfig = COUNTRIES[countryKey] || COUNTRIES["lebanon"];
    const airportCode = input.airportCode || countryConfig.airports[0].code;
    const airportConfig =
      countryConfig.airports.find((a) => a.code === airportCode) ||
      countryConfig.airports[0];


    const savedItinerary = await saveItineraryToDb(
      userId,
      input,
      result,
      countryConfig.name,
      airportCode
    );

    console.log(`Saved itinerary to DB with ID: ${savedItinerary.id}`);

    //Generate embeddings for RAG
    setImmediate(() => {
      generateEmbeddingsAsync(
        savedItinerary.id,
        countryConfig.name,
        input,
        travelStyles.join(", "),
        result
      ).catch((err) =>
        console.error("Background embedding generation failed:", err)
      );
    });


    const response = buildItineraryResponse(
      savedItinerary.id,
      input,
      result,
      countryConfig,
      airportConfig
    );

    console.log(
      ` Itinerary generated: ${
        response.days.length
      } days, ${response.days.reduce(
        (sum: number, d: any) => sum + d.locations.length,
        0
      )} locations`
    );

    return res.json(response);
  } catch (error: any) {
    console.error("Generate itinerary error:", error.message);
    return res
      .status(500)
      .json({ error: "Failed to generate itinerary", message: error.message });
  }
}


export async function listUserItineraries(req: Request, res: Response) {
  try {
    const userId = (req as AuthenticatedRequest).user!.userId;
    const itineraries = await itineraryProvider.findUserItineraries(userId);
    return res.json(itineraries);
  } catch (error: any) {
    console.error("List user itineraries error:", error);
    return res
      .status(500)
      .json({ error: "Failed to list itineraries", message: error.message });
  }
}


export async function getItineraryDetails(req: Request, res: Response) {
  try {
    const { id } = req.params;


    const itinerary = await itineraryProvider.findItineraryById(id);
    if (!itinerary) {
      return res.status(404).json({ error: "Itinerary not found" });
    }


    const { countryConfig, airportConfig } = getAirportConfig(
      itinerary.country,
      itinerary.airportCode
    );


    const response = buildItineraryDetailsResponse(
      itinerary,
      countryConfig,
      airportConfig
    );

    return res.json(response);
  } catch (error: any) {
    console.error("Get itinerary error:", error);
    return res
      .status(500)
      .json({ error: "Failed to get itinerary", message: error.message });
  }
}


export async function deleteItinerary(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = (req as AuthenticatedRequest).user!.userId;


    const itinerary = await itineraryProvider.findItineraryById(id);
    if (!itinerary) {
      return res.status(404).json({ error: "Itinerary not found" });
    }


    if (itinerary.userId !== userId) {
      return res.status(403).json({ error: "Only the owner can delete this itinerary" });
    }


    await itineraryProvider.deleteItinerary(id);

    return res.status(204).send();
  } catch (error: any) {
    console.error("Delete itinerary error:", error);
    return res
      .status(500)
      .json({ error: "Failed to delete itinerary", message: error.message });
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
            description: loc.description || "",
            activityTypes: [loc.category],
            costMinUSD: loc.costMinUSD,
            costMaxUSD: loc.costMaxUSD,
            rating: loc.rating,
            totalRatings: loc.totalRatings,
            topReviews: loc.topReviews,
            openingHours: loc.openingHours,
          },
        })),
      })),
    };

    await storeItineraryEmbeddings(itineraryData as any);
    console.log(` Embeddings generated for RAG`);
  } catch (embeddingError: any) {
    console.error(
      "Failed to generate embeddings (non-critical):",
      embeddingError.message
    );
  }
}
