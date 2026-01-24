import { z } from 'zod';

export const UpdateLocationSchema = z.object({
  itineraryId: z.string().min(1, 'Itinerary ID is required'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  heading: z.number().min(0).max(360).optional(),
  speed: z.number().min(0).optional(),
});

export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;
