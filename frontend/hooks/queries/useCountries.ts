import { useQuery } from '@tanstack/react-query';
import { countryService } from '../../services/api';
import { CountryConfig } from '../../types/api';

export const useCountries = () => {
  return useQuery({
    queryKey: ['countries'],
    queryFn: countryService.getCountries,
    staleTime: Infinity, // Countries data rarely changes
  });
};
