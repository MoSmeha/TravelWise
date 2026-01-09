import express from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

// ==========================================
// PLACES API ROUTES
// Query and manage stored place data
// ==========================================

// GET /api/places/photos - Get Google Places photos for a location
// MUST be before /:id route to avoid being caught by it
// GET /api/places/photos - Get Google Places photos for a location
// MUST be before /:id route to avoid being caught by it
router.get('/photos', async (req, res) => {
  try {
    const { name, lat, lng } = req.query;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Google Places API not configured' });
    }
    
    // Build location bias
    const locationBias = lat && lng ? `&locationbias=point:${lat},${lng}` : '';
    // Find place ID first
    const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery${locationBias}&fields=place_id,name&key=${apiKey}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData: any = await searchResponse.json();
    
    if (searchData.status !== 'OK' || !searchData.candidates || searchData.candidates.length === 0) {
      return res.json({ photos: [], reviews: [] });
    }
    
    const placeId = searchData.candidates[0].place_id;
    
    // Get details (photos and reviews)
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos,reviews&key=${apiKey}`;
    const detailsResponse = await fetch(detailsUrl);
    const detailsData: any = await detailsResponse.json();
    
    if (detailsData.status === 'OK' && detailsData.result) {
      const photos = (detailsData.result.photos || []).map((p: any) => 
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${p.photo_reference}&key=${apiKey}`
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
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// GET /api/places/search - Search for a place (DB first, then Google with ingestion)
router.get('/search', async (req, res) => {
  try {
    const { name, lat, lng } = req.query;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'name is required' });
    }
    
    // 1. Check DB first (Exact match or close enough)
    const existingPlace = await prisma.place.findFirst({
      where: { 
        name: { equals: name, mode: 'insensitive' }
      }
    });

    if (existingPlace) {
      console.log(`Found ${name} in DB.`);
      return res.json({
        place: existingPlace,
        source: 'db'
      });
    }

    // 2. If not in DB, search Google Places
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.log('No GOOGLE_PLACES_API_KEY configured');
      return res.json({ place: null, message: 'Google Places API not configured' });
    }
    
    // Build location bias
    const locationBias = lat && lng ? `&locationbias=point:${lat},${lng}` : '';
    const searchUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name)}&inputtype=textquery${locationBias}&fields=place_id,name,formatted_address,geometry,photos,opening_hours,price_level,rating,user_ratings_total&key=${apiKey}`;
    
    console.log('Fetching Google Places for:', name);
    const searchResponse = await fetch(searchUrl);
    const searchData: any = await searchResponse.json();
    
    if (searchData.status !== 'OK' || !searchData.candidates || searchData.candidates.length === 0) {
      console.log('No candidates found:', searchData.status);
      return res.json({ place: null });
    }
    
    const candidate = searchData.candidates[0];

    // Check if we already have this googlePlaceId (in case name mismatch)
    const existingByGoogleId = await prisma.place.findUnique({
      where: { googlePlaceId: candidate.place_id }
    });

    if (existingByGoogleId) {
       console.log(`Found ${name} in DB by Google ID.`);
       return res.json({
         place: existingByGoogleId,
         source: 'db'
       });
    }

    // 3. fetch details for reviews
    let details: any = {};
    if (candidate.place_id) {
       try {
         const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${candidate.place_id}&fields=reviews,editorial_summary&key=${apiKey}`;
         const detailsResp = await fetch(detailsUrl);
         const detailsData: any = await detailsResp.json();
         if (detailsData.status === 'OK') {
             details = detailsData.result;
         }
       } catch (e) {
         console.error('Error fetching details', e);
       }
    }

    // Simple City Extraction Strategy
    let city = 'Unknown';
    if (candidate.formatted_address) {
       // Rough heuristic for Lebanon cities
       const cities = ['Beirut', 'Byblos', 'Jbeil', 'Batroun', 'Jounieh', 'Sidon', 'Saida', 'Tyre', 'Sour', 'Tripoli', 'Baalbek', 'Zahle'];
       const addrLower = candidate.formatted_address.toLowerCase();
       for (const c of cities) {
           if (addrLower.includes(c.toLowerCase())) {
               city = c;
               break;
           }
       }
       if (city === 'Unknown' && addrLower.includes('lebanon')) {
           city = 'Lebanon'; 
       }
    }

    // 4. Ingest into DB
    const newPlace = await prisma.place.create({
      data: {
        name: candidate.name,
        description: details.editorial_summary?.overview || candidate.formatted_address || 'No description available',
        classification: 'CONDITIONAL', // Default
        category: 'OTHER', // Need better mapping logic or AI classifier
        googlePlaceId: candidate.place_id,
        latitude: candidate.geometry?.location?.lat || 0,
        longitude: candidate.geometry?.location?.lng || 0,
        address: candidate.formatted_address,
        rating: candidate.rating,
        totalRatings: candidate.user_ratings_total,
        priceLevel: candidate.price_level,
        openingHours: candidate.opening_hours || undefined, 
        topReviews: details.reviews ? details.reviews.slice(0, 3) : [],
        // Default values
        city: city,
        sources: ['google'],
        sourceUrls: [],
        activityTypes: [],
      }
    });

    console.log(`Ingested ${newPlace.name} into DB.`);
    
    return res.json({
      place: newPlace,
      source: 'google_ingest'
    });

  } catch (error) {
    console.error('Error in place search/ingest:', error);
    return res.status(500).json({ error: 'Failed to search places', details: String(error) });
  }
});

// GET /api/places/meta/cities - Get list of cities with place counts
router.get('/meta/cities', async (_req, res) => {
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
});

// GET /api/places/meta/categories - Get list of categories
router.get('/meta/categories', async (_req, res) => {
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
});

// GET /api/places - Query places with filters
router.get('/', async (req, res) => {
  try {
    const { 
      city, 
      category, 
      activityType,
      classification,
      limit = '50',
      offset = '0',
    } = req.query;
    
    const where: any = {};
    
    if (city && typeof city === 'string') {
      where.city = city;
    }
    
    if (category && typeof category === 'string') {
      where.category = category;
    }
    
    if (classification && typeof classification === 'string') {
      where.classification = classification;
    }
    
    if (activityType && typeof activityType === 'string') {
      where.activityTypes = { has: activityType };
    }
    
    const places = await prisma.place.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
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
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: parseInt(offset as string) + places.length < total,
      },
    });
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ error: 'Failed to fetch places' });
  }
});

// GET /api/places/:id - Get single place (MUST be last due to param matching)
router.get('/:id', async (req, res) => {
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
});

export default router;
