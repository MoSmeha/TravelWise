import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../store/authStore';

export const useUserItineraries = () => {
  const { accessToken } = useAuth();
  
  return useQuery({
    queryKey: ['user-itineraries'],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/itinerary/user`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return response.data;
    },
    enabled: !!accessToken,
  });
};

export const useItineraryDetails = (id: string) => {
  const { accessToken } = useAuth(); // Optional auth
  
  return useQuery({
    queryKey: ['itinerary', id],
    queryFn: async () => {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
      const response = await axios.get(`${API_BASE_URL}/itinerary/${id}`, { headers });
      return response.data;
    },
    enabled: !!id,
  });
};
