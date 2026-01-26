import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { itineraryShareService } from '../../services/itinerary-share';
import type { ItineraryShare } from '../../types/schemas';

// Query: Get collaborators for an itinerary
export const useItineraryCollaborators = (itineraryId: string | null) => {
  return useQuery({
    queryKey: ['itinerary-collaborators', itineraryId],
    queryFn: () => itineraryShareService.getCollaborators(itineraryId!),
    enabled: !!itineraryId,
  });
};

// Query: Get shared itineraries (itineraries shared with me)
export const useSharedItineraries = (status?: 'PENDING' | 'ACCEPTED' | 'REJECTED') => {
  return useQuery({
    queryKey: ['shared-itineraries', status],
    queryFn: () => itineraryShareService.getSharedItineraries(status),
  });
};

// Mutation: Invite a user to an itinerary
export const useInviteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      itineraryId, 
      userId, 
      permission = 'VIEWER' 
    }: { 
      itineraryId: string; 
      userId: string; 
      permission?: 'OWNER' | 'VIEWER';
    }) => itineraryShareService.inviteUser(itineraryId, userId, permission),
    onSuccess: (_, { itineraryId }) => {
      // Invalidate collaborators list for this itinerary
      queryClient.invalidateQueries({ queryKey: ['itinerary-collaborators', itineraryId] });
    },
  });
};

// Mutation: Accept an invitation
export const useAcceptInvitation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (shareId: string) => itineraryShareService.acceptInvitation(shareId),
    onSuccess: () => {
      // Invalidate shared itineraries list
      queryClient.invalidateQueries({ queryKey: ['shared-itineraries'] });
      // Also invalidate user itineraries since a new one is now accessible
      queryClient.invalidateQueries({ queryKey: ['user-itineraries'] });
    },
  });
};

// Mutation: Reject an invitation
export const useRejectInvitation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (shareId: string) => itineraryShareService.rejectInvitation(shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-itineraries'] });
    },
  });
};

// Mutation: Remove a collaborator
export const useRemoveCollaborator = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ shareId, itineraryId }: { shareId: string; itineraryId: string }) => 
      itineraryShareService.removeCollaborator(shareId),
    onSuccess: (_, { itineraryId }) => {
      queryClient.invalidateQueries({ queryKey: ['itinerary-collaborators', itineraryId] });
    },
  });
};

// Mutation: Update collaborator permission
export const useUpdatePermission = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      shareId, 
      itineraryId, 
      permission 
    }: { 
      shareId: string; 
      itineraryId: string; 
      permission: 'OWNER' | 'VIEWER';
    }) => itineraryShareService.updatePermission(shareId, permission),
    onSuccess: (_, { itineraryId }) => {
      queryClient.invalidateQueries({ queryKey: ['itinerary-collaborators', itineraryId] });
    },
  });
};

// Mutation: Delete an itinerary
export const useDeleteItinerary = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (itineraryId: string) => itineraryShareService.deleteItinerary(itineraryId),
    onSuccess: () => {
      // Invalidate user itineraries list
      queryClient.invalidateQueries({ queryKey: ['user-itineraries'] });
    },
  });
};
