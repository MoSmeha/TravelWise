import api from './api';

import { z } from 'zod';
import { 
  ItineraryShareSchema, 
  ItineraryShare 
} from '../types/schemas';

export const itineraryShareService = {
  async inviteUser(itineraryId: string, userId: string, permission: 'OWNER' | 'VIEWER' = 'VIEWER'): Promise<ItineraryShare> {
    const response = await api.post<ItineraryShare>(`/itinerary/${itineraryId}/share`, {
      userId,
      permission,
    });
    return ItineraryShareSchema.parse(response.data);
  },

  async getCollaborators(itineraryId: string): Promise<ItineraryShare[]> {
    const response = await api.get<ItineraryShare[]>(`/itinerary/${itineraryId}/shares`);
    return z.array(ItineraryShareSchema).parse(response.data);
  },

  async acceptInvitation(shareId: string): Promise<ItineraryShare> {
    const response = await api.put<ItineraryShare>(`/itinerary/share/${shareId}/accept`);
    return ItineraryShareSchema.parse(response.data);
  },

  async rejectInvitation(shareId: string): Promise<ItineraryShare> {
    const response = await api.put<ItineraryShare>(`/itinerary/share/${shareId}/reject`);
    return ItineraryShareSchema.parse(response.data);
  },

  async removeCollaborator(shareId: string): Promise<void> {
    await api.delete(`/itinerary/share/${shareId}`);
  },

  async updatePermission(shareId: string, permission: 'OWNER' | 'VIEWER'): Promise<ItineraryShare> {
    const response = await api.put<ItineraryShare>(`/itinerary/share/${shareId}/permission`, {
      permission,
    });
    return ItineraryShareSchema.parse(response.data);
  },

  async getSharedItineraries(status?: 'PENDING' | 'ACCEPTED' | 'REJECTED'): Promise<ItineraryShare[]> {
    const params = status ? { status } : {};
    const response = await api.get<ItineraryShare[]>('/itinerary/shared', { params });
    return z.array(ItineraryShareSchema).parse(response.data);
  },

  async deleteItinerary(itineraryId: string): Promise<void> {
    await api.delete(`/itinerary/${itineraryId}`);
  },
};
