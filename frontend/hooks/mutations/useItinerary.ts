import { useMutation } from '@tanstack/react-query';
import { itineraryService } from '../../services/api';
import { GenerateItineraryRequest, ItineraryResponse, RAGResponse } from '../../types/api';

export const useGenerateItinerary = () => {
  return useMutation({
    mutationFn: (data: GenerateItineraryRequest) => itineraryService.generateItinerary(data),
  });
};

export const useAskQuestion = () => {
  return useMutation({
    mutationFn: ({ itineraryId, question }: { itineraryId: string; question: string }) => 
      itineraryService.askQuestion(itineraryId, question),
  });
};
