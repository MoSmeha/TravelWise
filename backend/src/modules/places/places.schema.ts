

import { z } from 'zod';


export const searchPlaceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  lat: z.string().optional(),
  lng: z.string().optional(),
});

export type SearchPlaceInput = z.infer<typeof searchPlaceSchema>;


export const getPhotosSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  lat: z.string().optional(),
  lng: z.string().optional(),
});

export type GetPhotosInput = z.infer<typeof getPhotosSchema>;


export const listPlacesSchema = z.object({
  city: z.string().optional(),
  category: z.string().optional(),
  activityType: z.string().optional(),
  classification: z.string().optional(),
  limit: z.string().optional().default('50'),
  offset: z.string().optional().default('0'),
});

export type ListPlacesInput = z.infer<typeof listPlacesSchema>;


export const placeIdParamSchema = z.object({
  id: z.string().min(1, 'Place ID is required'),
});

export type PlaceIdParam = z.infer<typeof placeIdParamSchema>;
