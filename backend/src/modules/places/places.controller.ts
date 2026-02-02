import { Request, Response } from 'express';
import { GetPhotosInput, ListPlacesInput, SearchPlaceInput } from './places.schema.js';
import { placesService } from './places.service.js';



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


export async function getDirections(req: Request, res: Response) {
  try {
    const { originLat, originLng, destLat, destLng, waypoints } = req.query;

    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({ error: 'Missing origin or destination coordinates' });
    }

    const waypointsParsed = waypoints ? JSON.parse(String(waypoints)) : [];

    const result = await placesService.getDirections(
      { lat: parseFloat(String(originLat)), lng: parseFloat(String(originLng)) },
      { lat: parseFloat(String(destLat)), lng: parseFloat(String(destLng)) },
      waypointsParsed
    );

    return res.json({ points: result?.points || null });
  } catch (error) {
    console.error('Error fetching directions:', error);
    return res.status(500).json({ error: 'Failed to fetch directions' });
  }
}


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


export async function getCities(_req: Request, res: Response) {
  try {
    const cities = await placesService.getCities();
    res.json({ data: cities });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
}


export async function getCategories(_req: Request, res: Response) {
  try {
    const categories = await placesService.getCategories();
    res.json({ data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
}


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
