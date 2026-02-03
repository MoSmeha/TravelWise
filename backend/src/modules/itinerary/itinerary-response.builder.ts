import { mapPlaceForGenerateResponse, mapPlaceToLocation, mapPlaceToMeal, mapPlaceToHotel, mapAirportToResponse } from '../shared/utils/response-mappers.js';
import { ItineraryResult } from './itinerary.types.js';

/**
 * Build the API response for a newly generated itinerary.
 */
export function buildItineraryResponse(
  itineraryId: string, 
  input: any, 
  result: ItineraryResult,
  countryConfig: any,
  airportConfig: any
) {
  const totalCost = result.totalEstimatedCostUSD || input.budgetUSD;
  
  const daysWithIds = result.days.map((d: any) => ({
    id: `day-${d.dayNumber}`,
    dayNumber: d.dayNumber,
    description: d.description,
    theme: d.theme,
    locations: d.locations.map((loc: any, idx: number) => mapPlaceForGenerateResponse(loc, idx, d.dayNumber)),
    meals: d.meals ? {
      breakfast: mapPlaceForGenerateResponse(d.meals.breakfast, 0, d.dayNumber),
      lunch: mapPlaceForGenerateResponse(d.meals.lunch, 1, d.dayNumber),
      dinner: mapPlaceForGenerateResponse(d.meals.dinner, 2, d.dayNumber),
    } : null,
    hotel: d.hotel ? mapPlaceForGenerateResponse(d.hotel, 0, d.dayNumber) : null,
    routeDescription: d.routeDescription,
  }));
  
  // Build hotel response
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
    hotel, // Keep singular for backward compatibility if needed
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
    hotels: result.hotel ? [{
      id: result.hotel.id,
      name: result.hotel.name,
      description: result.hotel.description || `${result.hotel.rating || 4}★ hotel`,
      pricePerNightUSD: { min: 80, max: 150 },
      latitude: result.hotel.latitude,
      longitude: result.hotel.longitude,
      bookingUrl: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(result.hotel.name)}`,
      amenities: ['WiFi', 'Parking', 'Breakfast'],
      neighborhood: result.hotel.city || result.hotel.address || 'City Center',
      imageUrl: result.hotel.imageUrl || result.hotel.imageUrls?.[0] || null,
    }] : [],
    routeSummary: result.routeSummary || '',
  };
}

/**
 * Build the API response for fetched itinerary details.
 */
export function buildItineraryDetailsResponse(
  itinerary: any,
  _countryConfig: any,  // kept for API consistency with buildItineraryResponse
  airportConfig: any
) {
  const days = itinerary.days.map((day: any) => {
    const activities = day.items.filter((i: any) => i.itemType === 'ACTIVITY');
    const meals = {
      breakfast: day.items.find((i: any) => i.itemType === 'BREAKFAST')?.place || null,
      lunch: day.items.find((i: any) => i.itemType === 'LUNCH')?.place || null,
      dinner: day.items.find((i: any) => i.itemType === 'DINNER')?.place || null,
    };

    const locations = activities.map((item: any) => 
      mapPlaceToLocation(item.place, item.notes)
    );

    return {
      id: day.id,
      dayNumber: day.dayNumber,
      theme: day.theme,
      description: day.description || `Day ${day.dayNumber}`,
      locations,
      meals: {
        breakfast: mapPlaceToMeal(meals.breakfast),
        lunch: mapPlaceToMeal(meals.lunch),
        dinner: mapPlaceToMeal(meals.dinner),
      },
      hotel: mapPlaceToHotel(day.hotel),
    };
  });

  // Get the primary hotel (first day's hotel, or first hotel found)
  const primaryHotel = itinerary.days.find((d: any) => d.hotel)?.hotel || null;
  console.log(`[DEBUG] buildItineraryDetailsResponse - primaryHotel found:`, primaryHotel ? `${primaryHotel.name} (id: ${primaryHotel.id})` : 'null');
  console.log(`[DEBUG] First day hotel:`, itinerary.days[0]?.hotel ? `${itinerary.days[0].hotel.name}` : 'null');

  // Map warnings from DB
  const warnings = (itinerary.warnings || []).map((w: any, idx: number) => ({
    id: w.id || `warn-${idx}`,
    title: w.title,
    description: w.description,
  }));

  // Map tourist traps from DB
  const touristTraps = (itinerary.touristTraps || []).map((t: any, idx: number) => ({
    id: t.id || `trap-${idx}`,
    name: t.name,
    reason: t.reason,
  }));

  // Map local tips from DB
  const localTips = (itinerary.localTips || []).map((t: any) => t.tip);

  return {
    source: 'DATABASE',
    itinerary: {
      id: itinerary.id,
      numberOfDays: itinerary.numberOfDays,
      budgetUSD: itinerary.budgetUSD,
      totalEstimatedCostUSD: itinerary.totalEstimatedCostUSD,
      travelStyles: itinerary.travelStyles,
    },
    days,
    hotel: mapPlaceToHotel(primaryHotel),
    hotels: primaryHotel ? [{
      id: primaryHotel.id,
      name: primaryHotel.name,
      description: primaryHotel.description || `${primaryHotel.rating || 4}★ hotel`,
      pricePerNightUSD: { min: 80, max: 150 }, // Placeholder since we don't track actual prices
      latitude: primaryHotel.latitude,
      longitude: primaryHotel.longitude,
      bookingUrl: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(primaryHotel.name)}`,
      amenities: ['WiFi', 'Parking', 'Breakfast'],
      neighborhood: primaryHotel.city || primaryHotel.address || 'City Center',
      imageUrl: primaryHotel.imageUrl || primaryHotel.imageUrls?.[0] || null,
    }] : [],
    airport: mapAirportToResponse(airportConfig, {
      country: itinerary.country,
      code: itinerary.airportCode,
    }),
    warnings,
    touristTraps,
    localTips,
    routeSummary: itinerary.routeSummary,
  };
}
