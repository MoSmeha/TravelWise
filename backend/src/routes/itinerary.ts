import { Router } from 'express';
import {
  getCountries,
  generate,
  listUserItineraries,
  getItineraryDetails,
  deleteItinerary,
} from '../controllers/itinerary.controller.js';
import {
  inviteUserToItinerary,
  listCollaborators,
  acceptItineraryInvitation,
  rejectItineraryInvitation,
  removeItineraryCollaborator,
  updateCollaboratorPermission,
  listSharedItineraries,
} from '../controllers/itinerary-share.controller.js';
import { requireOwnership } from '../middleware/ownership.middleware.js';
import { validate } from '../middleware/validate.js';
import { generateItinerarySchema } from '../schemas/itinerary.schema.js';

const router = Router();


router.get('/countries', getCountries);


router.post('/generate', validate(generateItinerarySchema), generate);


router.get('/user', listUserItineraries);


router.get('/shared', listSharedItineraries);


router.get('/:id', requireOwnership('itinerary'), getItineraryDetails);


router.delete('/:id', deleteItinerary);


router.post('/:id/share', inviteUserToItinerary);


router.get('/:id/shares', listCollaborators);


router.put('/share/:shareId/accept', acceptItineraryInvitation);


router.put('/share/:shareId/reject', rejectItineraryInvitation);


router.delete('/share/:shareId', removeItineraryCollaborator);


router.put('/share/:shareId/permission', updateCollaboratorPermission);

export default router;
