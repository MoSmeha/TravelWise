import { Router } from 'express';
import * as placesController from '../controllers/places.controller';
import { validate } from '../middleware/validate';
import { getPhotosSchema, listPlacesSchema, searchPlaceSchema } from '../schemas/places.schema';

const router = Router();

// GET /api/places/photos - Get Google Places photos
// Note: Must be defined before /:id route to avoid param matching
router.get('/photos', validate(getPhotosSchema, 'query'), placesController.getPhotos);

// GET /api/places/search - Search for a place
router.get('/search', validate(searchPlaceSchema, 'query'), placesController.searchPlace);

// GET /api/places/meta/cities - Get list of cities
router.get('/meta/cities', placesController.getCities);

// GET /api/places/meta/categories - Get list of categories
router.get('/meta/categories', placesController.getCategories);

// GET /api/places - Query places with filters
router.get('/', validate(listPlacesSchema, 'query'), placesController.listPlaces);

// GET /api/places/:id - Get single place (MUST be last)
router.get('/:id', placesController.getPlaceById);

export default router;
