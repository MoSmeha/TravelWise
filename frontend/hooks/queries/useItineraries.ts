import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../store/authStore';

export const useUserItineraries = () => {
  const { accessToken } = useAuth();
  
  return useQuery({
    queryKey: ['user-itineraries'],
    queryFn: async () => {
      // Using the api instance which has the 401 interceptor for token refresh
      const response = await api.get('/itinerary/user');
      return response.data;
    },
    enabled: !!accessToken,
  });
};

export const useItineraryDetails = (id: string) => {
  const { accessToken } = useAuth(); // Used only for enabling the query
  
  return useQuery({
    queryKey: ['itinerary', id],
    queryFn: async () => {
      // Using the api instance which has the 401 interceptor for token refresh
      const response = await api.get(`/itinerary/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};
