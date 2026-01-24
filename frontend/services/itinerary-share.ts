import api from './api';

export interface ItineraryShare {
  id: string;
  itineraryId: string;
  userId: string;
  permission: 'OWNER' | 'VIEWER';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  invitedBy: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string;
  };
  inviter?: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string;
  };
  itinerary?: {
    id: string;
    country: string;
    numberOfDays: number;
    budgetUSD?: number;
    travelStyles?: string[];
    createdAt?: string;
  };
}

export const itineraryShareService = {
  // Invite a friend to collaborate on an itinerary
  async inviteUser(itineraryId: string, userId: string, permission: 'OWNER' | 'VIEWER' = 'VIEWER'): Promise<ItineraryShare> {
    const response = await api.post<ItineraryShare>(`/itinerary/${itineraryId}/share`, {
      userId,
      permission,
    });
    return response.data;
  },

  // Get all collaborators for an itinerary
  async getCollaborators(itineraryId: string): Promise<ItineraryShare[]> {
    const response = await api.get<ItineraryShare[]>(`/itinerary/${itineraryId}/shares`);
    return response.data;
  },

  // Accept an invitation
  async acceptInvitation(shareId: string): Promise<ItineraryShare> {
    const response = await api.put<ItineraryShare>(`/itinerary/share/${shareId}/accept`);
    return response.data;
  },

  // Reject an invitation
  async rejectInvitation(shareId: string): Promise<ItineraryShare> {
    const response = await api.put<ItineraryShare>(`/itinerary/share/${shareId}/reject`);
    return response.data;
  },

  // Remove a collaborator
  async removeCollaborator(shareId: string): Promise<void> {
    await api.delete(`/itinerary/share/${shareId}`);
  },

  // Update collaborator permission
  async updatePermission(shareId: string, permission: 'OWNER' | 'VIEWER'): Promise<ItineraryShare> {
    const response = await api.put<ItineraryShare>(`/itinerary/share/${shareId}/permission`, {
      permission,
    });
    return response.data;
  },

  // Get all itineraries shared with the user
  async getSharedItineraries(status?: 'PENDING' | 'ACCEPTED' | 'REJECTED'): Promise<ItineraryShare[]> {
    const params = status ? { status } : {};
    const response = await api.get<ItineraryShare[]>('/itinerary/shared', { params });
    return response.data;
  },

  // Delete an itinerary (only owner can delete)
  async deleteItinerary(itineraryId: string): Promise<void> {
    await api.delete(`/itinerary/${itineraryId}`);
  },
};
