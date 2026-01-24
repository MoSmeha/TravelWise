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

// GET /countries - List supported countries
router.get('/countries', getCountries);

// POST /generate - Generate a new itinerary (requires authentication - applied at router level in index.ts)
router.post('/generate', validate(generateItinerarySchema), generate);

// GET /user - List user's itineraries
router.get('/user', listUserItineraries);

// GET /shared - Get all shared itineraries for the user
router.get('/shared', listSharedItineraries);

// GET /:id - Get full itinerary details (requires ownership)
router.get('/:id', requireOwnership('itinerary'), getItineraryDetails);

// DELETE /:id - Delete an itinerary (only owner can delete)
router.delete('/:id', deleteItinerary);

// POST /:id/share - Invite a user to collaborate
router.post('/:id/share', inviteUserToItinerary);

// GET /:id/shares - List all collaborators
router.get('/:id/shares', listCollaborators);

// PUT /share/:shareId/accept - Accept invitation
router.put('/share/:shareId/accept', acceptItineraryInvitation);

// PUT /share/:shareId/reject - Reject invitation
router.put('/share/:shareId/reject', rejectItineraryInvitation);

// DELETE /share/:shareId - Remove collaborator
router.delete('/share/:shareId', removeItineraryCollaborator);

// PUT /share/:shareId/permission - Update collaborator permission
router.put('/share/:shareId/permission', updateCollaboratorPermission);

export default router;
