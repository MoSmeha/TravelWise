import { z } from 'zod';

// New schema matching the redesigned flow
export const generateItinerarySchema = z.object({
  country: z.string().min(1, 'Country is required'),
  airportCode: z.string().min(2, 'Airport code is required'),
  numberOfDays: z.number().int().min(1).max(30),
  budgetUSD: z.number().min(1, 'Budget must be positive'),
});

export type GenerateItineraryInput = z.infer<typeof generateItinerarySchema>;
