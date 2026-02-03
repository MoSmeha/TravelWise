import { useQuery } from '@tanstack/react-query';
import { countryService } from '../../services/country';
import { CountryConfig } from '../../types/api';

export const useCountries = () => {
  return useQuery({
    queryKey: ['countries'],
    queryFn: countryService.getCountries,
    staleTime: Infinity,
  });
};
