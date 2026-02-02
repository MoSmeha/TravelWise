import { Router } from 'express';
import {
  getPhotos,
  searchPlace,
  getCities,
  getCategories,
  listPlaces,
  getPlaceById,
  getDirections,
} from '../modules/places/places.controller.js';
import { validate } from '../middleware/validate.js';
import { getPhotosSchema, listPlacesSchema, searchPlaceSchema } from '../schemas/places.schema.js';

const router = Router();


router.get('/photos', validate(getPhotosSchema, 'query'), getPhotos);


router.get('/directions', getDirections);


router.get('/search', validate(searchPlaceSchema, 'query'), searchPlace);


router.get('/meta/cities', getCities);


router.get('/meta/categories', getCategories);


router.get('/', validate(listPlacesSchema, 'query'), listPlaces);


router.get('/:id', getPlaceById);

export default router;
