import { z } from 'zod';

// ============ ENUMS ============

export const LocationClassificationSchema = z.enum(['HIDDEN_GEM', 'CONDITIONAL', 'TOURIST_TRAP']);
export const CrowdLevelSchema = z.enum(['QUIET', 'MODERATE', 'BUSY']);
export const LocationCategorySchema = z.enum([
  'RESTAURANT', 'CAFE', 'BAR', 'NIGHTCLUB',
  'BEACH', 'HIKING', 'HISTORICAL_SITE', 'MUSEUM',
  'MARKET', 'VIEWPOINT', 'PARK', 'RELIGIOUS_SITE',
  'TEMPLE', 'SHOPPING', 'ACTIVITY', 'OTHER'
]).or(z.string());

// ============ SUB-SCHEMAS ============

export const AirportSchema = z.object({
  name: z.string(),
  code: z.string(),
  latitude: z.number(),
  longitude: z.number(),
});

export const CountryConfigSchema = z.object({
  key: z.string(),
  name: z.string(),
  code: z.string(),
  currency: z.string(),
  minBudgetPerDay: z.number(),
  airports: z.array(AirportSchema),
  regions: z.array(z.string()).optional(),
});

export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  classification: LocationClassificationSchema,
  category: LocationCategorySchema,
  description: z.string(),
  costMinUSD: z.number().optional(),
  costMaxUSD: z.number().optional(),
  crowdLevel: CrowdLevelSchema.or(z.string()),
  bestTimeToVisit: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  aiReasoning: z.string().optional(),
  scamWarning: z.string().optional(),
  travelTimeFromPrevious: z.string().optional(),
  imageUrl: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
});

export const HotelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  pricePerNightUSD: z.object({ min: z.number(), max: z.number() }),
  latitude: z.number(),
  longitude: z.number(),
  bookingUrl: z.string(),
  amenities: z.array(z.string()),
  warnings: z.string().optional(),
  neighborhood: z.string(),
});

export const TouristTrapSchema = z.object({
  id: z.string(),
  name: z.string(),
  reason: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const ItineraryDaySchema = z.object({
  id: z.string(),
  dayNumber: z.number(),
  description: z.string().optional(),
  routeDescription: z.string().optional(),
  dailyBudgetUSD: z.number().optional(),
  locations: z.array(LocationSchema),
});

export const CountrySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  currency: z.string(),
});

export const WarningSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  severity: z.string(),
  category: z.string(),
});

export const ItineraryResponseSchema = z.object({
  source: z.literal('AI'),
  itinerary: z.object({
    id: z.string(),
    numberOfDays: z.number(),
    budgetUSD: z.number(),
    totalEstimatedCostUSD: z.number().optional(),
    budgetBreakdown: z.object({
      food: z.number(),
      activities: z.number(),
      transport: z.number(),
      accommodation: z.number(),
    }).optional(),
  }),
  days: z.array(ItineraryDaySchema),
  hotels: z.array(HotelSchema),
  airport: AirportSchema,
  country: CountrySchema,
  warnings: z.array(WarningSchema),
  touristTraps: z.array(TouristTrapSchema),
  localTips: z.array(z.string()),
  routeSummary: z.string(),
});

// ============ NEW FEATURES ============

export const PlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  classification: LocationClassificationSchema,
  category: LocationCategorySchema,
  description: z.string(),
  sources: z.array(z.string()),
  popularity: z.number(),
  rating: z.number().optional(),
  city: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  activityTypes: z.array(z.string()),
  costMinUSD: z.number().optional(),
  costMaxUSD: z.number().optional(),
  localTip: z.string().optional(),
  scamWarning: z.string().optional(),
  imageUrl: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
});

export const ChecklistItemSchema = z.object({
  id: z.string(),
  category: z.enum(['ESSENTIALS', 'WEATHER', 'TERRAIN', 'ACTIVITY', 'SAFETY', 'DOCUMENTATION']),
  item: z.string(),
  reason: z.string().optional(),
  source: z.string().optional(),
  isChecked: z.boolean(),
});

export const RAGActionSchema = z.object({
  type: z.enum(['ADD_PLACE', 'REPLACE_PLACE', 'REORDER', 'SUGGEST_ADD_DB']),
  placeId: z.string().optional(),
  placeName: z.string().optional(),
  dayNumber: z.number().optional(),
  order: z.number().optional(),
  reason: z.string(),
});

export const RAGResponseSchema = z.object({
  answer: z.string(),
  actions: z.array(RAGActionSchema).optional(),
  sources: z.array(z.string()),
  confidence: z.number(),
  staleWarning: z.string().optional(),
});
