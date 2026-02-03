import { useQuery } from '@tanstack/react-query';
import api from '../../services/api-client';
import { useAuth } from '../../store/authStore';

export const useUserItineraries = () => {
  const { accessToken } = useAuth();
  
  return useQuery({
    queryKey: ['user-itineraries'],
    queryFn: async () => {

      const response = await api.get('/itinerary/user');
      return response.data;
    },
    enabled: !!accessToken,
  });
};

export const useItineraryDetails = (id: string) => {
  const { accessToken } = useAuth();
  
  return useQuery({
    queryKey: ['itinerary', id],
    queryFn: async () => {

      const response = await api.get(`/itinerary/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};
