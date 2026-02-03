import { z } from 'zod';
import api from './api-client';
import type { CountryConfig } from '../types/api';
import { CountryConfigSchema } from '../types/schemas';

export const countryService = {
  async getCountries(): Promise<CountryConfig[]> {
    const response = await api.get<{ countries: CountryConfig[] }>('/itinerary/countries');
    const schema = z.object({ countries: z.array(CountryConfigSchema) });
    const parsed = schema.parse(response.data);
    return parsed.countries;
  },
};
