/**
 * Itinerary Zod Schemas
 * Validation schemas for itinerary-related endpoints
 */

import { z } from 'zod';

/**
 * Schema for generating an itinerary
 */
export const generateItinerarySchema = z.object({
  cityId: z.string().min(1, 'City ID is required'),
  airportCode: z.string().optional(),
  numberOfDays: z.number().min(1).max(30),
  budgetLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  travelStyle: z.enum(['NATURE', 'FOOD', 'CULTURE', 'NIGHTLIFE', 'MIXED']).optional(),
  budgetUSD: z.number().positive().optional().default(1000),
  startDate: z.string().optional(),
});

export type GenerateItineraryInput = z.infer<typeof generateItinerarySchema>;

/**
 * Schema for RAG question
 */
export const askQuestionSchema = z.object({
  question: z.string().min(1, 'Question is required'),
});

export type AskQuestionInput = z.infer<typeof askQuestionSchema>;

/**
 * Schema for itinerary ID param
 */
export const itineraryIdParamSchema = z.object({
  id: z.string().min(1, 'Itinerary ID is required'),
});

export type ItineraryIdParam = z.infer<typeof itineraryIdParamSchema>;
