

import { z } from 'zod';


export const generateItinerarySchema = z.object({
  cityId: z.string().min(1, 'City ID is required'),
  airportCode: z.string().optional(),
  numberOfDays: z.number().min(1).max(30),
  budgetLevel: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  travelStyles: z.array(z.enum([
    'ADVENTURE', 'CULTURAL', 'NATURE_ECO', 
    'BEACH_RELAXATION', 'URBAN_CITY', 'FAMILY_GROUP'
  ])).max(3).optional(),
  budgetUSD: z.number().positive().optional().default(1000),
  startDate: z.string().optional(),
});

export type GenerateItineraryInput = z.infer<typeof generateItinerarySchema>;


export const askQuestionSchema = z.object({
  question: z.string().min(1, 'Question is required'),
});

export type AskQuestionInput = z.infer<typeof askQuestionSchema>;


export const itineraryIdParamSchema = z.object({
  id: z.string().min(1, 'Itinerary ID is required'),
});

export type ItineraryIdParam = z.infer<typeof itineraryIdParamSchema>;
