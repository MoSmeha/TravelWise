import 'dotenv/config';

import { Airport, CountryConfig } from '../config/countries.config';
import { getOpenAIClient } from '../utils/openai.utils';

// ============ TYPES ============

export interface AIHotel {
  name: string;
  description: string;
  pricePerNightUSD: { min: number; max: number };
  latitude: number;
  longitude: number;
  bookingUrl: string;
  amenities: string[];
  warnings?: string;
  neighborhood: string;
}

export interface AILocation {
  name: string;
  classification: 'HIDDEN_GEM' | 'CONDITIONAL' | 'TOURIST_TRAP';
  category: string;
  description: string;
  costMinUSD: number;
  costMaxUSD: number;
  crowdLevel: 'QUIET' | 'MODERATE' | 'BUSY';
  bestTimeToVisit: string;
  latitude: number;
  longitude: number;
  reasoning: string;
  scamWarning?: string;
  travelTimeFromPrevious?: string;
}

export interface AIGeneratedDay {
  dayNumber: number;
  theme: string;
  locations: AILocation[];
  dailyBudgetUSD: number;
  routeDescription: string;
}

export interface AITouristTrap {
  name: string;
  reason: string;
  latitude?: number;
  longitude?: number;
}

export interface AIItineraryResult {
  days: AIGeneratedDay[];
  hotels: AIHotel[];
  totalEstimatedCostUSD: number;
  budgetBreakdown: {
    food: number;
    activities: number;
    transport: number;
    accommodation: number;
  };
  generalWarnings: string[];
  touristTraps: AITouristTrap[];
  localTips: string[];
  routeSummary: string;
}

// ============ MAIN FUNCTION ============

export async function generateItineraryWithAI(
  country: CountryConfig,
  airport: Airport,
  numberOfDays: number,
  budgetUSD: number
): Promise<AIItineraryResult> {
  const dailyBudget = Math.floor(budgetUSD / numberOfDays);
  const regionsStr = country.regions?.join(', ') || country.name;
  
  const prompt = `You are a LOCAL EXPERT and TRAVEL ADVISOR for ${country.name}. Create a comprehensive, AUTHENTIC travel itinerary covering THE ENTIRE COUNTRY, not just the main city.

=== TRIP DETAILS ===
- Country: ${country.name}
- Arrival Airport: ${airport.name} (${airport.code})
- Airport Coordinates: ${airport.latitude}, ${airport.longitude}
- Number of Days: ${numberOfDays}
- Total Budget: $${budgetUSD} USD (approximately $${dailyBudget}/day)
- Local Currency: ${country.currency}

=== REGIONS TO COVER ===
You MUST include hidden gems from MULTIPLE regions across ${country.name}:
${regionsStr}

=== YOUR MISSION ===
Generate a COMPLETE travel plan with:
1. HIDDEN GEMS: Authentic local spots across ALL REGIONS of ${country.name} - not just the main city!
2. HOTELS: Real hotels with booking search links (one per major area visited)
3. OPTIMIZED ROUTE: Starting from the airport, create a logical route through the country
4. WARNINGS: Fraud risks, crowded areas, safety concerns for each region
5. TOURIST TRAPS: Famous places to AVOID across the ENTIRE country (at least 5-8 traps)

=== CRITICAL RULES ===
1. SPREAD hidden gems across MULTIPLE REGIONS - don't cluster in one city!
2. ALL coordinates must be REAL and ACCURATE for ${country.name}
3. For ${numberOfDays} days, plan to visit ${Math.min(numberOfDays, 4)} different areas/regions
4. Hotels should be REAL hotels that exist
5. Include SCAM WARNINGS for each major area
6. Each day should have 3-5 locations from different parts of that region
7. Tourist traps should cover the ENTIRE country, not just one city
8. Include travel time estimates between locations AND between regions

=== HOTEL BOOKING LINKS ===
Generate booking search URLs in this format:
https://www.booking.com/searchresults.html?ss=[Hotel+Name]+[City]+${country.name}

=== CLASSIFICATION RULES ===
- HIDDEN_GEM: Authentic local spot, not overcrowded, good value, locals go here
- CONDITIONAL: Can be good at specific times but touristy at peak times
- TOURIST_TRAP: List these in the touristTraps array (include famous overhyped places from ALL regions)

=== REQUIRED JSON RESPONSE ===
{
  "days": [
    {
      "dayNumber": 1,
      "theme": "Arrival & [First Region] Exploration",
      "routeDescription": "From airport to [area], covering [specific neighborhoods/towns]",
      "dailyBudgetUSD": ${dailyBudget},
      "locations": [
        {
          "name": "Location Name",
          "classification": "HIDDEN_GEM",
          "category": "RESTAURANT|CAFE|BAR|BEACH|HIKING|HISTORICAL_SITE|MUSEUM|MARKET|VIEWPOINT|PARK|TEMPLE|SHOPPING|OTHER",
          "description": "Very brief authentic description (max 15 words)",
          "costMinUSD": 0,
          "costMaxUSD": 20,
          "crowdLevel": "QUIET|MODERATE|BUSY",
          "bestTimeToVisit": "Morning 8-10am to avoid crowds",
          "latitude": 0.0,
          "longitude": 0.0,
          "reasoning": "Why this is authentic and worth visiting",
          "scamWarning": "Optional: Watch out for...",
          "travelTimeFromPrevious": "15 min by taxi"
        }
      ]
    }
  ],
  "hotels": [
    {
      "name": "Real Hotel Name",
      "description": "Brief description (max 15 words)",
      "pricePerNightUSD": { "min": 50, "max": 100 },
      "latitude": 0.0,
      "longitude": 0.0,
      "bookingUrl": "https://www.booking.com/searchresults.html?ss=Hotel+Name+City+${country.name}",
      "amenities": ["WiFi", "Pool", "Breakfast"],
      "warnings": "Optional: Note about the area",
      "neighborhood": "Region/City name"
    }
  ],
  "touristTraps": [
    {
      "name": "Overpriced Famous Place",
      "reason": "Why to avoid: overpriced, crowded, not authentic",
      "latitude": 0.0,
      "longitude": 0.0
    }
  ],
  "totalEstimatedCostUSD": ${budgetUSD},
  "budgetBreakdown": {
    "food": 0,
    "activities": 0,
    "transport": 0,
    "accommodation": 0
  },
  "generalWarnings": [
    "Warning about fraud/safety specific to each region visited",
    "Areas to avoid or be careful in"
  ],
  "localTips": [
    "Useful local tip for getting around between regions",
    "Best transport options for traveling ${country.name}"
  ],
  "routeSummary": "Day-by-day regional overview: Day 1 covers [Region A], Day 2 moves to [Region B]..."
}

RESPOND WITH ONLY VALID JSON. NO EXPLANATIONS OUTSIDE JSON.`;

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1', // Ensure this model supports large context. If not, use 'gpt-4-turbo-preview'
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 8192,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(content) as AIItineraryResult;

    // Validate response structure
    if (!result.days || !Array.isArray(result.days)) {
      throw new Error('Invalid response: missing days array');
    }
    if (!result.hotels || !Array.isArray(result.hotels)) {
      throw new Error('Invalid response: missing hotels array');
    }

    // Ensure all locations have valid coordinates
    for (const day of result.days) {
      for (const loc of day.locations) {
        if (typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') {
          console.warn(`Invalid coordinates for ${loc.name}, using airport coordinates`);
          loc.latitude = airport.latitude;
          loc.longitude = airport.longitude;
        }
      }
    }

    // Ensure all hotels have valid booking URLs
    for (const hotel of result.hotels) {
      if (!hotel.bookingUrl || !hotel.bookingUrl.startsWith('http')) {
        const encodedName = encodeURIComponent(`${hotel.name} ${country.name}`);
        hotel.bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodedName}`;
      }
    }

    console.log(`✅ AI generated ${result.days.length} days, ${result.hotels.length} hotels, ${result.touristTraps?.length || 0} traps to avoid`);

    return result;
  } catch (error) {
    console.error('OpenAI itinerary generation error:', error);
    throw error;
  }
}
