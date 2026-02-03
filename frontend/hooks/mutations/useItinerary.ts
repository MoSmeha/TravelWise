import { useMutation, useQueryClient } from '@tanstack/react-query';
import { itineraryService } from '../../services/itinerary';
import { GenerateItineraryRequest, ItineraryResponse, RAGResponse } from '../../types/api';

export const useGenerateItinerary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateItineraryRequest) => itineraryService.generateItinerary(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-itineraries'] });
    },
  });
};

export const useAskQuestion = () => {
  return useMutation({
    mutationFn: ({ itineraryId, question }: { itineraryId: string; question: string }) => 
      itineraryService.askQuestion(itineraryId, question),
  });
};
