import { Router } from 'express';
import {
  getPhotos,
  searchPlace,
  getCities,
  getCategories,
  listPlaces,
  getPlaceById,
  getDirections,
} from '../controllers/places.controller.js';
import { validate } from '../middleware/validate.js';
import { getPhotosSchema, listPlacesSchema, searchPlaceSchema } from '../schemas/places.schema.js';

const router = Router();

// GET /api/places/photos - Get Google Places photos
// Note: Must be defined before /:id route to avoid param matching
router.get('/photos', validate(getPhotosSchema, 'query'), getPhotos);

// GET /api/places/directions - Get directions between points
router.get('/directions', getDirections);

// GET /api/places/search - Search for a place
router.get('/search', validate(searchPlaceSchema, 'query'), searchPlace);

// GET /api/places/meta/cities - Get list of cities
router.get('/meta/cities', getCities);

// GET /api/places/meta/categories - Get list of categories
router.get('/meta/categories', getCategories);

// GET /api/places - Query places with filters
router.get('/', validate(listPlacesSchema, 'query'), listPlaces);

// GET /api/places/:id - Get single place (MUST be last)
router.get('/:id', getPlaceById);

export default router;
