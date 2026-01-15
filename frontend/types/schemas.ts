import { z } from 'zod';

// ============ ENUMS ============

export const LocationClassificationSchema = z.enum(['HIDDEN_GEM', 'CONDITIONAL', 'TOURIST_TRAP', 'MUST_SEE']);
export const CrowdLevelSchema = z.enum(['EMPTY', 'QUIET', 'MODERATE', 'BUSY', 'OVERCROWDED']);
export const PriceLevelSchema = z.enum(['INEXPENSIVE', 'MODERATE', 'EXPENSIVE']);
export const LocationCategorySchema = z.enum([
  'RESTAURANT', 'CAFE', 'BAR', 'NIGHTCLUB',
  'BEACH', 'HIKING', 'HISTORICAL_SITE', 'MUSEUM',
  'MARKET', 'VIEWPOINT', 'PARK', 'RELIGIOUS_SITE',
  'SHOPPING', 'ACTIVITY', 'HOTEL', 'ACCOMMODATION', 'OTHER'
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

// Helper to transform null to undefined (API returns null, TypeScript types use undefined)
const nullToUndefined = <T,>(val: T | null): T | undefined => val ?? undefined;

export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  classification: LocationClassificationSchema,
  category: LocationCategorySchema,
  description: z.string(),
  costMinUSD: z.number().nullable().optional().transform(nullToUndefined),
  costMaxUSD: z.number().nullable().optional().transform(nullToUndefined),
  crowdLevel: CrowdLevelSchema.or(z.string()).nullable().optional().transform(nullToUndefined),
  bestTimeToVisit: z.string().nullable().optional().transform(nullToUndefined),
  latitude: z.number(),
  longitude: z.number(),
  aiReasoning: z.string().nullable().optional().transform(nullToUndefined),
  scamWarning: z.string().nullable().optional().transform(nullToUndefined),
  travelTimeFromPrevious: z.string().optional(),
  imageUrl: z.string().nullable().optional().transform(nullToUndefined),
  imageUrls: z.array(z.string()).nullable().optional().transform(nullToUndefined),
  rating: z.number().nullable().optional().transform(nullToUndefined),
  totalRatings: z.number().nullable().optional().transform(nullToUndefined),
  topReviews: z.array(z.any()).optional(),
  openingHours: z.any().optional(),
  priceLevel: PriceLevelSchema.optional(),
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

export const ItineraryItemTypeSchema = z.enum(['ACTIVITY', 'BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'EVENING']);

export const MealInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: LocationCategorySchema,
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  imageUrl: z.string().nullable().optional().transform(nullToUndefined),
}).nullable();

export const HotelInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: LocationCategorySchema,
  latitude: z.number(),
  longitude: z.number(),
  imageUrl: z.string().optional(),
  rating: z.number().optional(),
  address: z.string().optional(),
}).nullable();

export const DayMealsSchema = z.object({
  breakfast: MealInfoSchema,
  lunch: MealInfoSchema,
  dinner: MealInfoSchema,
});

export const ItineraryDaySchema = z.object({
  id: z.string(),
  dayNumber: z.number(),
  theme: z.string().optional(),
  description: z.string().optional(),
  routeDescription: z.string().optional(),
  dailyBudgetUSD: z.number().optional(),
  locations: z.array(LocationSchema),
  meals: DayMealsSchema.optional(),
  hotel: HotelInfoSchema.optional(),
});

export const CountrySchema = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string(),
  currency: z.string(),
});

export const WarningSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string(),
  severity: z.string().optional(),
  category: z.string().optional(),
});

export const ItineraryResponseSchema = z.object({
  source: z.enum(['AI', 'DATABASE']),
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
  hotel: HotelInfoSchema.optional(),
  hotels: z.array(HotelSchema).optional().default([]),
  airport: AirportSchema,
  country: CountrySchema.optional(),
  warnings: z.array(WarningSchema).optional().default([]),
  touristTraps: z.array(TouristTrapSchema).optional().default([]),
  localTips: z.array(z.string()).optional().default([]),
  routeSummary: z.string().optional(),
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
  totalRatings: z.number().optional(),
  priceLevel: PriceLevelSchema.optional(),
  city: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  activityTypes: z.array(z.string()),
  costMinUSD: z.number().nullable().optional(),
  costMaxUSD: z.number().nullable().optional(),
  localTip: z.string().optional(),
  scamWarning: z.string().optional(),
  imageUrl: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  openingHours: z.any().optional(),
});

export const ChecklistItemSchema = z.object({
  id: z.string(),
  category: z.enum(['ESSENTIALS', 'WEATHER', 'TERRAIN', 'ACTIVITY', 'SAFETY', 'DOCUMENTATION']).or(z.string()),
  item: z.string(),
  reason: z.string().nullable().optional().transform(nullToUndefined),
  source: z.string().nullable().optional().transform(nullToUndefined),
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
