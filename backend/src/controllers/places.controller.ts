/**
 * Places Controller
 * Handles HTTP concerns for places endpoints
 */

import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { GetPhotosInput, ListPlacesInput, SearchPlaceInput } from '../schemas/places.schema';
import { extractCityFromAddress } from '../utils/enum-mappers';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const GOOGLE_PLACES_BASE_URL = 'https://maps.googleapis.com/maps/api/place';

/**
 * GET /api/places/photos
 * Get Google Places photos for a location
 */
export async function getPhotos(req: Request, res: Response) {
  try {
    const { name, lat, lng } = req.query as unknown as GetPhotosInput;
    
    if (!GOOGLE_PLACES_API_KEY) {
      return res.status(500).json({ error: 'Google Places API not configured' });
    }
    
    // Build location bias
    const locationBias = lat && lng ? `&locationbias=point:${lat},${lng}` : '';
    
    // Find place ID first
    const searchUrl = `${GOOGLE_PLACES_BASE_URL}/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery${locationBias}&fields=place_id,name&key=${GOOGLE_PLACES_API_KEY}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData: any = await searchResponse.json();
    
    if (searchData.status !== 'OK' || !searchData.candidates || searchData.candidates.length === 0) {
      return res.json({ photos: [], reviews: [] });
    }
    
    const placeId = searchData.candidates[0].place_id;
    
    // Get details (photos and reviews)
    const detailsUrl = `${GOOGLE_PLACES_BASE_URL}/details/json?place_id=${placeId}&fields=photos,reviews&key=${GOOGLE_PLACES_API_KEY}`;
    const detailsResponse = await fetch(detailsUrl);
    const detailsData: any = await detailsResponse.json();
    
    if (detailsData.status === 'OK' && detailsData.result) {
      const photos = (detailsData.result.photos || []).map((p: any) =>
        `${GOOGLE_PLACES_BASE_URL}/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
      );
      
      const reviews = (detailsData.result.reviews || []).slice(0, 5).map((r: any) => ({
        author: r.author_name,
        rating: r.rating,
        text: r.text,
        time: r.relative_time_description
      }));
      
      return res.json({ photos, reviews });
    }
    
    return res.json({ photos: [], reviews: [] });
    
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
    
    // 1. Check DB first (Exact match or close enough)
    const existingPlace = await prisma.place.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' }
      }
    });

    if (existingPlace) {
      console.log(`Found ${name} in DB.`);
      return res.json({ place: existingPlace, source: 'db' });
    }

    // 2. If not in DB, search Google Places
    if (!GOOGLE_PLACES_API_KEY) {
      console.log('No GOOGLE_PLACES_API_KEY configured');
      return res.json({ place: null, message: 'Google Places API not configured' });
    }
    
    const locationBias = lat && lng ? `&locationbias=point:${lat},${lng}` : '';
    const searchUrl = `${GOOGLE_PLACES_BASE_URL}/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery${locationBias}&fields=place_id,name,formatted_address,geometry,photos,opening_hours,price_level,rating,user_ratings_total&key=${GOOGLE_PLACES_API_KEY}`;
    
    console.log('Fetching Google Places for:', name);
    const searchResponse = await fetch(searchUrl);
    const searchData: any = await searchResponse.json();
    
    if (searchData.status !== 'OK' || !searchData.candidates || searchData.candidates.length === 0) {
      console.log('No candidates found:', searchData.status);
      return res.json({ place: null });
    }
    
    const candidate = searchData.candidates[0];

    // Check if we already have this googlePlaceId
    const existingByGoogleId = await prisma.place.findUnique({
      where: { googlePlaceId: candidate.place_id }
    });

    if (existingByGoogleId) {
      console.log(`Found ${name} in DB by Google ID.`);
      return res.json({ place: existingByGoogleId, source: 'db' });
    }

    // 3. Fetch details for reviews
    let details: any = {};
    if (candidate.place_id) {
      try {
        const detailsUrl = `${GOOGLE_PLACES_BASE_URL}/details/json?place_id=${candidate.place_id}&fields=reviews,editorial_summary&key=${GOOGLE_PLACES_API_KEY}`;
        const detailsResp = await fetch(detailsUrl);
        const detailsData: any = await detailsResp.json();
        if (detailsData.status === 'OK') {
          details = detailsData.result;
        }
      } catch (e) {
        console.error('Error fetching details', e);
      }
    }

    // Extract city from formatted address
    const city = extractCityFromAddress(candidate.formatted_address || '');

    // 4. Ingest into DB
    const newPlace = await prisma.place.create({
      data: {
        name: candidate.name,
        description: details.editorial_summary?.overview || candidate.formatted_address || 'No description available',
        classification: 'CONDITIONAL',
        category: 'OTHER',
        googlePlaceId: candidate.place_id,
        latitude: candidate.geometry?.location?.lat || 0,
        longitude: candidate.geometry?.location?.lng || 0,
        address: candidate.formatted_address,
        rating: candidate.rating,
        totalRatings: candidate.user_ratings_total,
        priceLevel: candidate.price_level,
        openingHours: candidate.opening_hours || undefined,
        topReviews: details.reviews ? details.reviews.slice(0, 3) : [],
        city,
        sources: ['google'],
        sourceUrls: [],
        activityTypes: [],
      }
    });

    console.log(`Ingested ${newPlace.name} into DB.`);
    
    return res.json({ place: newPlace, source: 'google_ingest' });

  } catch (error) {
    console.error('Error in place search/ingest:', error);
    return res.status(500).json({ error: 'Failed to search places', details: String(error) });
  }
}

/**
 * GET /api/places/meta/cities
 * Get list of cities with place counts
 */
export async function getCities(_req: Request, res: Response) {
  try {
    const cities = await prisma.place.groupBy({
      by: ['city'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    
    res.json({
      data: cities.map((c: any) => ({
        name: c.city,
        placeCount: c._count.id,
      })),
    });
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
    const categories = await prisma.place.groupBy({
      by: ['category'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    
    res.json({
      data: categories.map((c: any) => ({
        name: c.category,
        placeCount: c._count.id,
      })),
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
}

/**
 * GET /api/places
 * Query places with filters
 */
export async function listPlaces(req: Request, res: Response) {
  try {
    const { city, category, activityType, classification, limit, offset } = req.query as unknown as ListPlacesInput;
    
    const where: any = {};
    
    if (city) where.city = city;
    if (category) where.category = category;
    if (classification) where.classification = classification;
    if (activityType) where.activityTypes = { has: activityType };
    
    const take = parseInt(limit || '50');
    const skip = parseInt(offset || '0');
    
    const places = await prisma.place.findMany({
      where,
      take,
      skip,
      orderBy: [
        { popularity: 'desc' },
        { rating: 'desc' },
      ],
    });
    
    const total = await prisma.place.count({ where });
    
    res.json({
      data: places,
      pagination: {
        total,
        limit: take,
        offset: skip,
        hasMore: skip + places.length < total,
      },
    });
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
    
    const place = await prisma.place.findUnique({
      where: { id },
    });
    
    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }
    
    return res.json({ data: place });
  } catch (error) {
    console.error('Error fetching place:', error);
    return res.status(500).json({ error: 'Failed to fetch place' });
  }
}
