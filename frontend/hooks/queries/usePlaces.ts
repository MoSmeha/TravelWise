import { useQuery } from '@tanstack/react-query';
import { placesService } from '../../services/api';
import { PlacesResponse, Place } from '../../types/api';

interface UsePlacesParams {
  city?: string;
  category?: string;
  activityType?: string;
  classification?: string;
  limit?: number;
  offset?: number;
}

export const usePlaces = (params?: UsePlacesParams) => {
  return useQuery({
    queryKey: ['places', params],
    queryFn: () => placesService.getPlaces(params),
  });
};

export const usePlace = (id: string) => {
  return useQuery({
    queryKey: ['place', id],
    queryFn: () => placesService.getPlace(id),
    enabled: !!id,
  });
};

export const useCities = () => {
  return useQuery({
    queryKey: ['cities'],
    queryFn: placesService.getCities,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
};

export const usePlacePhotos = (name: string, lat?: number, lng?: number, enabled: boolean = false) => {
  return useQuery({
    queryKey: ['placePhotos', name, lat, lng],
    queryFn: () => placesService.getPlacePhotos(name, lat, lng),
    enabled,
    staleTime: 1000 * 60 * 30, // 30 mins
  });
};
