import api from './api-client';
import type {
  GenerateItineraryRequest,
  ItineraryResponse,
  RAGResponse
} from '../types/api';
import {
  ItineraryResponseSchema,
  RAGResponseSchema
} from '../types/schemas';

export const itineraryService = {
  async generateItinerary(request: GenerateItineraryRequest): Promise<ItineraryResponse> {
    const response = await api.post<ItineraryResponse>('/itinerary/generate', request);
    return ItineraryResponseSchema.parse(response.data);
  },
  
  async askQuestion(itineraryId: string, question: string): Promise<RAGResponse> {
    const response = await api.post<RAGResponse>(`/itinerary/${itineraryId}/ask`, { question });
    return RAGResponseSchema.parse(response.data);
  },
};
