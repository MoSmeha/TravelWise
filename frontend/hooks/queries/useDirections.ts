import { useQueries } from '@tanstack/react-query';
import { placesService } from '../../services/places';
import { decodePolyline } from '../../lib/polyline';

interface RouteCoord {
  latitude: number;
  longitude: number;
}

interface UseDirectionsParams {
  origin: RouteCoord;
  destination: RouteCoord;
  waypoints?: RouteCoord[];
}

export const useDirections = (params: UseDirectionsParams | null) => {
  const { origin, destination, waypoints = [] } = params || {};
  
  const queryKey = params 
    ? ['directions', origin?.latitude, origin?.longitude, destination?.latitude, destination?.longitude, waypoints.map(w => `${w.latitude},${w.longitude}`).join('|')]
    : ['directions', 'disabled'];

  return {
    queryKey,
    queryFn: async () => {
      if (!origin || !destination) return null;
      
      const result = await placesService.getDirections(
        origin.latitude,
        origin.longitude,
        destination.latitude,
        destination.longitude,
        waypoints.map(p => ({ lat: p.latitude, lng: p.longitude }))
      );
      
      if (result?.points) {
        return decodePolyline(result.points);
      }
      return null;
    },
    enabled: !!params && !!origin && !!destination,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24 * 7,
  };
};

/**
 * Fetch directions for multiple routes in parallel with deduplication
 */
export const useMultipleDirections = (routes: (UseDirectionsParams | null)[]) => {
  const queries = routes.map((route) => {
    const config = useDirections(route);
    return {
      queryKey: config.queryKey,
      queryFn: config.queryFn,
      enabled: config.enabled,
      staleTime: config.staleTime,
      gcTime: config.gcTime,
    };
  });

  return useQueries({ queries });
};
