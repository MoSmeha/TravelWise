import { z } from 'zod';



export const LocationClassificationSchema = z.enum(['HIDDEN_GEM', 'CONDITIONAL', 'TOURIST_TRAP', 'MUST_SEE']);
export const CrowdLevelSchema = z.enum(['EMPTY', 'QUIET', 'MODERATE', 'BUSY', 'OVERCROWDED']);
export const PriceLevelSchema = z.enum(['INEXPENSIVE', 'MODERATE', 'EXPENSIVE']);
export const LocationCategorySchema = z.enum([
  'RESTAURANT', 'CAFE', 'BAR', 'NIGHTCLUB',
  'BEACH', 'HIKING', 'HISTORICAL_SITE', 'MUSEUM',
  'MARKET', 'VIEWPOINT', 'PARK', 'RELIGIOUS_SITE',
  'SHOPPING', 'ACTIVITY', 'HOTEL', 'ACCOMMODATION', 'OTHER'
]).or(z.string());

export const BudgetLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const TravelStyleSchema = z.enum([
  'ADVENTURE', 'CULTURAL', 'NATURE_ECO', 
  'BEACH_RELAXATION', 'URBAN_CITY', 'FAMILY_GROUP'
]);



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
  imageUrl: z.string().nullable().optional().transform(nullToUndefined),
  rating: z.number().nullable().optional().transform(nullToUndefined),
  address: z.string().nullable().optional().transform(nullToUndefined),
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

export const GenerateItineraryRequestSchema = z.object({
  country: z.string(),
  airportCode: z.string(),
  numberOfDays: z.number(),
  budgetUSD: z.number(),
  travelStyles: z.array(TravelStyleSchema).optional(),
  budgetLevel: BudgetLevelSchema.optional(),
  flightDate: z.string().optional(),
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


export const PlaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  classification: LocationClassificationSchema,
  category: LocationCategorySchema,
  description: z.string(),
  sources: z.array(z.string()),
  popularity: z.number(),
  rating: z.number().nullable().optional().transform(nullToUndefined),
  totalRatings: z.number().nullable().optional().transform(nullToUndefined),
  priceLevel: PriceLevelSchema.optional(),
  city: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  activityTypes: z.array(z.string()),
  costMinUSD: z.number().nullable().optional().transform(nullToUndefined),
  costMaxUSD: z.number().nullable().optional().transform(nullToUndefined),
  localTip: z.string().nullable().optional().transform(nullToUndefined),
  scamWarning: z.string().nullable().optional().transform(nullToUndefined),
  imageUrl: z.string().nullable().optional().transform(nullToUndefined),
  imageUrls: z.array(z.string()).nullable().optional().transform(nullToUndefined),
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



export const ConversationTypeSchema = z.enum(['DIRECT', 'GROUP']);

export const MessageUserInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  avatarUrl: z.string(),
});

export const ConversationParticipantSchema = z.object({
  userId: z.string(),
  role: z.string(),
  lastReadAt: z.string(),
  user: MessageUserInfoSchema.optional(),
});

export const MessageSchema = z.object({
  id: z.string(),
  content: z.string(),
  senderId: z.string(),
  conversationId: z.string(),
  createdAt: z.string(),
  sender: MessageUserInfoSchema.optional(),
});

export const ConversationSchema = z.object({
  id: z.string(),
  type: ConversationTypeSchema,
  name: z.string().nullable(),
  imageUrl: z.string().nullable(),
  updatedAt: z.string(),
  participants: z.array(ConversationParticipantSchema),
  lastMessage: MessageSchema.nullable().optional(),
  unreadCount: z.number().optional(),
});

export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  hasMore: z.boolean(),
});

export const PaginatedConversationsSchema = z.object({
  data: z.array(ConversationSchema),
  pagination: PaginationSchema,
});

export const PaginatedMessagesSchema = z.object({
  data: z.array(MessageSchema),
  pagination: PaginationSchema,
});


export const PostVisibilitySchema = z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE']);

export const PostAuthorSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  avatarUrl: z.string().optional(),
});

export const PostSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  author: PostAuthorSchema,
  imageUrl: z.string(),
  description: z.string().nullable().optional().transform(val => val ?? undefined),
  visibility: PostVisibilitySchema,
  likesCount: z.number(),
  commentsCount: z.number(),
  isLiked: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CommentSchema = z.object({
  id: z.string(),
  postId: z.string(),
  authorId: z.string(),
  author: PostAuthorSchema,
  content: z.string(),
  createdAt: z.string(),
});

export const PaginatedPostResponseSchema = z.object({
  data: z.array(PostSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export const PaginatedCommentResponseSchema = z.object({
  data: z.array(CommentSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export const PlacesResponseSchema = z.object({
  data: z.array(PlaceSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

export type PostVisibility = z.infer<typeof PostVisibilitySchema>;
export type PostAuthor = z.infer<typeof PostAuthorSchema>;
export type Post = z.infer<typeof PostSchema>;
export type Comment = z.infer<typeof CommentSchema>;
export type PaginatedPostResponse = z.infer<typeof PaginatedPostResponseSchema>;
export type PaginatedCommentResponse = z.infer<typeof PaginatedCommentResponseSchema>;
export type PlacesResponse = z.infer<typeof PlacesResponseSchema>;
export type ConversationType = z.infer<typeof ConversationTypeSchema>;
export type MessageUserInfo = z.infer<typeof MessageUserInfoSchema>;
export type ConversationParticipant = z.infer<typeof ConversationParticipantSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type PaginatedConversations = z.infer<typeof PaginatedConversationsSchema>;
export type PaginatedMessages = z.infer<typeof PaginatedMessagesSchema>;



export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  username: z.string(),
  avatarUrl: z.string().optional(),
  emailVerified: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const AuthResponseSchema = z.object({
  user: UserSchema,
  token: z.string(),
  refreshToken: z.string(),
});

export const RegisterResponseSchema = z.object({
  message: z.string(),
  user: UserSchema,
});

export const AuthMessageResponseSchema = z.object({
  message: z.string(),
});

export const RefreshTokenResponseSchema = z.object({
  token: z.string(),
  refreshToken: z.string(),
});

export const LikeUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
  avatarUrl: z.string().optional(),
});

export const LikeSchema = z.object({
  postId: z.string(),
  userId: z.string(),
  user: LikeUserSchema,
  createdAt: z.string(),
});

export const CreatePostInputSchema = z.object({
  description: z.string().optional(),
  visibility: PostVisibilitySchema.optional(),
});

export const RegisterInputSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  name: z.string(),
  username: z.string(),
});

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const VerifyEmailInputSchema = z.object({
  email: z.string().email(),
  otp: z.string(),
});

export const ResendVerificationInputSchema = z.object({
  email: z.string().email(),
});

export type User = z.infer<typeof UserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;



export const ItineraryShareSchema = z.object({
  id: z.string(),
  itineraryId: z.string(),
  userId: z.string(),
  permission: z.enum(['OWNER', 'VIEWER']),
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']),
  invitedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    avatarUrl: z.string(),
  }).optional(),
  inviter: z.object({
    id: z.string(),
    name: z.string(),
    username: z.string(),
    avatarUrl: z.string(),
  }).optional(),
  itinerary: z.object({
    id: z.string(),
    country: z.string(),
    numberOfDays: z.number(),
    budgetUSD: z.number().optional(),
    travelStyles: z.array(z.string()).optional(),
    createdAt: z.string().optional(),
  }).optional(),
});


export type LocationClassification = z.infer<typeof LocationClassificationSchema>;
export type CrowdLevel = z.infer<typeof CrowdLevelSchema>;
export type PriceLevel = z.infer<typeof PriceLevelSchema>;
export type LocationCategory = z.infer<typeof LocationCategorySchema>;

export type Airport = z.infer<typeof AirportSchema>;
export type CountryConfig = z.infer<typeof CountryConfigSchema>;

export type Location = z.infer<typeof LocationSchema>;
export type Hotel = z.infer<typeof HotelSchema>;
export type TouristTrap = z.infer<typeof TouristTrapSchema>;

export type ItineraryItemType = z.infer<typeof ItineraryItemTypeSchema>;
export type MealInfo = z.infer<typeof MealInfoSchema>;
export type HotelInfo = z.infer<typeof HotelInfoSchema>;
export type DayMeals = z.infer<typeof DayMealsSchema>;
export type ItineraryDay = z.infer<typeof ItineraryDaySchema>;
export type Country = z.infer<typeof CountrySchema>;
export type Warning = z.infer<typeof WarningSchema>;

export type ItineraryResponse = z.infer<typeof ItineraryResponseSchema>;
export type Place = z.infer<typeof PlaceSchema>;
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type RAGAction = z.infer<typeof RAGActionSchema>;
export type RAGResponse = z.infer<typeof RAGResponseSchema>;

export type BudgetLevel = z.infer<typeof BudgetLevelSchema>;
export type TravelStyle = z.infer<typeof TravelStyleSchema>;
export type GenerateItineraryRequest = z.infer<typeof GenerateItineraryRequestSchema>;

export type LikeUser = z.infer<typeof LikeUserSchema>;
export type Like = z.infer<typeof LikeSchema>;
export type CreatePostInput = z.infer<typeof CreatePostInputSchema>;

export type RegisterInput = z.infer<typeof RegisterInputSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailInputSchema>;
export type ResendVerificationInput = z.infer<typeof ResendVerificationInputSchema>;

export type ItineraryShare = z.infer<typeof ItineraryShareSchema>;

