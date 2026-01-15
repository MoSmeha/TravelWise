/**
 * Places Controller
 * Handles HTTP concerns for places endpoints
 * Business logic is delegated to placesService
 */

import { Request, Response } from 'express';
import { GetPhotosInput, ListPlacesInput, SearchPlaceInput } from '../schemas/places.schema';
import { placesService } from '../services/places.service';

// ============================================================================
// Photos & Search
// ============================================================================

/**
 * GET /api/places/photos
 * Get Google Places photos for a location
 */
export async function getPhotos(req: Request, res: Response) {
  try {
    const { name, lat, lng, id } = req.query as unknown as GetPhotosInput & { id?: string };

    const result = await placesService.getPhotosAndReviews(
      name, 
      id, 
      lat ? parseFloat(String(lat)) : undefined, 
      lng ? parseFloat(String(lng)) : undefined
    );

    return res.json(result);
  } catch (error) {
    console.error('Error fetching photos:', error);
    return res.status(500).json({ error: 'Failed to fetch photos' });
  }
}

/**
 * GET /api/places/search
 * Search for a place (DB first, then Google with ingestion)
 */
export async function searchPlace(req: Request, res: Response) {
  try {
    const { name, lat, lng } = req.query as unknown as SearchPlaceInput;

    const result = await placesService.searchPlace(
      name, 
      lat ? parseFloat(String(lat)) : undefined, 
      lng ? parseFloat(String(lng)) : undefined
    );

    if (result.message) {
      return res.json({ place: result.place, message: result.message });
    }

    return res.json({ place: result.place, source: result.source });
  } catch (error) {
    console.error('Error in place search/ingest:', error);
    return res.status(500).json({ error: 'Failed to search places', details: String(error) });
  }
}

// ============================================================================
// Metadata
// ============================================================================

/**
 * GET /api/places/meta/cities
 * Get list of cities with place counts
 */
export async function getCities(_req: Request, res: Response) {
  try {
    const cities = await placesService.getCities();
    res.json({ data: cities });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
}

/**
 * GET /api/places/meta/categories
 * Get list of categories
 */
export async function getCategories(_req: Request, res: Response) {
  try {
    const categories = await placesService.getCategories();
    res.json({ data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
}

// ============================================================================
// CRUD
// ============================================================================

/**
 * GET /api/places
 * Query places with filters
 */
export async function listPlaces(req: Request, res: Response) {
  try {
    const input = req.query as unknown as ListPlacesInput;

    const result = await placesService.listPlaces({
      city: input.city,
      category: input.category as any,
      classification: input.classification as any,
      activityType: input.activityType,
      limit: input.limit ? parseInt(input.limit) : undefined,
      offset: input.offset ? parseInt(input.offset) : undefined,
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ error: 'Failed to fetch places' });
  }
}

/**
 * GET /api/places/:id
 * Get single place by ID
 */
export async function getPlaceById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const place = await placesService.getPlaceById(id);

    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    return res.json({ data: place });
  } catch (error) {
    console.error('Error fetching place:', error);
    return res.status(500).json({ error: 'Failed to fetch place' });
  }
}
