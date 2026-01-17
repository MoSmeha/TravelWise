import { CIRCUIT_BREAKERS, CircuitOpenError, withCircuitBreaker } from '../lib/circuit-breaker';
import { CACHE_KEYS, CACHE_TTL, cacheGet, cacheSet } from './cache.service';


const OPENWEATHERMAP_API_KEY = process.env.OPENWEATHERMAP_API_KEY;
const OPENWEATHERMAP_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Types
export interface WeatherForecast {
  date: Date;
  dateString: string;
  tempMin: number;
  tempMax: number;
  tempAvg: number;
  condition: WeatherCondition;
  conditionIcon: string;
  description: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  uvIndex?: number;
}

export type WeatherCondition = 
  | 'clear' 
  | 'clouds' 
  | 'rain' 
  | 'thunderstorm' 
  | 'snow' 
  | 'drizzle' 
  | 'mist'
  | 'unknown';

export interface WeatherResult {
  forecast: WeatherForecast[] | null;
  source: 'live' | 'cache' | 'historical' | 'unavailable';
  isStale: boolean;
  reliability: 'high' | 'medium' | 'low';
  message?: string;
  locationName?: string;
}

// Historical averages for Lebanon by month (fallback data)
const LEBANON_HISTORICAL_AVERAGES: Record<number, { tempMin: number; tempMax: number; condition: WeatherCondition; precipitation: number }> = {
  0: { tempMin: 8, tempMax: 14, condition: 'rain', precipitation: 180 },      // January
  1: { tempMin: 8, tempMax: 15, condition: 'rain', precipitation: 150 },      // February
  2: { tempMin: 10, tempMax: 18, condition: 'clouds', precipitation: 100 },   // March
  3: { tempMin: 13, tempMax: 22, condition: 'clouds', precipitation: 50 },    // April
  4: { tempMin: 16, tempMax: 26, condition: 'clear', precipitation: 15 },     // May
  5: { tempMin: 20, tempMax: 30, condition: 'clear', precipitation: 2 },      // June
  6: { tempMin: 23, tempMax: 32, condition: 'clear', precipitation: 0 },      // July
  7: { tempMin: 23, tempMax: 32, condition: 'clear', precipitation: 0 },      // August
  8: { tempMin: 21, tempMax: 30, condition: 'clear', precipitation: 5 },      // September
  9: { tempMin: 18, tempMax: 27, condition: 'clouds', precipitation: 40 },    // October
  10: { tempMin: 13, tempMax: 21, condition: 'rain', precipitation: 120 },    // November
  11: { tempMin: 9, tempMax: 16, condition: 'rain', precipitation: 170 },     // December
};

// Check if API is configured
export function isWeatherConfigured(): boolean {
  return !!OPENWEATHERMAP_API_KEY && OPENWEATHERMAP_API_KEY !== 'your_openweathermap_api_key_here';
}

// Map OpenWeatherMap condition to our type
function mapCondition(weatherMain: string): WeatherCondition {
  const main = weatherMain.toLowerCase();
  if (main.includes('clear') || main.includes('sun')) return 'clear';
  if (main.includes('cloud')) return 'clouds';
  if (main.includes('rain')) return 'rain';
  if (main.includes('thunder') || main.includes('storm')) return 'thunderstorm';
  if (main.includes('snow')) return 'snow';
  if (main.includes('drizzle')) return 'drizzle';
  if (main.includes('mist') || main.includes('fog') || main.includes('haze')) return 'mist';
  return 'unknown';
}

// Get weather forecast for a location
export async function getWeatherForecast(
  lat: number, 
  lng: number, 
  days: number = 5
): Promise<WeatherResult> {
  const cacheKey = CACHE_KEYS.weather(lat, lng);
  
  // Check cache first
  const cached = cacheGet<WeatherForecast[]>(cacheKey);
  if (cached) {
    return {
      forecast: cached.slice(0, days),
      source: 'cache',
      isStale: false,
      reliability: 'medium',
      message: 'Using cached weather data',
    };
  }
  
  if (!isWeatherConfigured()) {
    return getHistoricalFallback(lat, lng, days, 'Weather API not configured');
  }
  
  try {
    const result = await withCircuitBreaker(
      CIRCUIT_BREAKERS.openWeatherMap,
      'OpenWeatherMap',
      async () => {
        // Use 5-day forecast API (free tier)
        const url = new URL(`${OPENWEATHERMAP_BASE_URL}/forecast`);
        url.searchParams.set('lat', lat.toString());
        url.searchParams.set('lon', lng.toString());
        url.searchParams.set('units', 'metric');
        url.searchParams.set('appid', OPENWEATHERMAP_API_KEY!);
        
        const response = await fetch(url.toString());
        
        if (!response.ok) {
          throw new Error(`OpenWeatherMap API error: ${response.status}`);
        }
        
        return response.json();
      }
    ) as any;
    
    if (result.list && result.list.length > 0) {
      // Group by day and calculate daily summary
      const dailyForecasts = processForecastData(result.list);
      
      // Cache the result
      cacheSet(cacheKey, dailyForecasts, CACHE_TTL.weather);
      
      return {
        forecast: dailyForecasts.slice(0, days),
        source: 'live',
        isStale: false,
        reliability: 'high',
        locationName: result.city?.name,
      };
    }
    
    return getHistoricalFallback(lat, lng, days, 'No forecast data available');
    
  } catch (error) {
    if (error instanceof CircuitOpenError) {
      console.warn('OpenWeatherMap circuit breaker is open');
    } else {
      console.error('Weather API error:', error);
    }
    
    // Try cache even if stale
    const staleCache = cacheGet<WeatherForecast[]>(cacheKey);
    if (staleCache) {
      return {
        forecast: staleCache.slice(0, days),
        source: 'cache',
        isStale: true,
        reliability: 'medium',
        message: 'Using stale cached data due to API error',
      };
    }
    
    return getHistoricalFallback(lat, lng, days, 
      error instanceof Error ? error.message : 'Weather API unavailable');
  }
}

// Process forecast list into daily summaries
function processForecastData(list: any[]): WeatherForecast[] {
  const dailyMap = new Map<string, any[]>();
  
  // Group by date
  for (const item of list) {
    const date = item.dt_txt.split(' ')[0];
    if (!dailyMap.has(date)) {
      dailyMap.set(date, []);
    }
    dailyMap.get(date)!.push(item);
  }
  
  const forecasts: WeatherForecast[] = [];
  
  for (const [dateStr, items] of dailyMap) {
    const temps = items.map(i => i.main.temp);
    const tempMin = Math.min(...items.map(i => i.main.temp_min));
    const tempMax = Math.max(...items.map(i => i.main.temp_max));
    const tempAvg = temps.reduce((a, b) => a + b, 0) / temps.length;
    
    // Find most common/severe weather condition
    const conditions = items.map(i => i.weather[0].main);
    const conditionCounts = conditions.reduce((acc, c) => {
      acc[c] = (acc[c] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mainCondition = (Object.entries(conditionCounts) as [string, number][])
      .sort((a, b) => b[1] - a[1])[0][0];
    
    // Get icon from midday if available
    const middayItem = items.find(i => i.dt_txt.includes('12:00:00')) || items[0];
    
    forecasts.push({
      date: new Date(dateStr),
      dateString: dateStr,
      tempMin: Math.round(tempMin),
      tempMax: Math.round(tempMax),
      tempAvg: Math.round(tempAvg),
      condition: mapCondition(mainCondition),
      conditionIcon: middayItem.weather[0].icon,
      description: middayItem.weather[0].description,
      humidity: Math.round(items.reduce((a, i) => a + i.main.humidity, 0) / items.length),
      windSpeed: Math.round(items.reduce((a, i) => a + i.wind.speed, 0) / items.length),
      precipitation: items.reduce((a, i) => a + (i.pop || 0), 0) / items.length * 100,
    });
  }
  
  return forecasts;
}

// Get historical averages as fallback
function getHistoricalFallback(
  _lat: number, 
  _lng: number, 
  days: number, 
  reason: string
): WeatherResult {
  const forecasts: WeatherForecast[] = [];
  const today = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const month = date.getMonth();
    
    const historical = LEBANON_HISTORICAL_AVERAGES[month];
    
    forecasts.push({
      date,
      dateString: date.toISOString().split('T')[0],
      tempMin: historical.tempMin,
      tempMax: historical.tempMax,
      tempAvg: Math.round((historical.tempMin + historical.tempMax) / 2),
      condition: historical.condition,
      conditionIcon: historical.condition === 'clear' ? '01d' : historical.condition === 'rain' ? '10d' : '03d',
      description: `Historical average for ${date.toLocaleString('default', { month: 'long' })}`,
      humidity: historical.condition === 'rain' ? 75 : 50,
      windSpeed: 10,
      precipitation: historical.precipitation / 30, // Approximate daily
    });
  }
  
  return {
    forecast: forecasts,
    source: 'historical',
    isStale: true,
    reliability: 'low',
    message: `Using historical averages. ${reason}. Pack for variable conditions.`,
  };
}

// Generate weather-based tips
export function generateWeatherTips(forecast: WeatherForecast[]): string[] {
  const tips: string[] = [];
  
  const hasRain = forecast.some(f => f.condition === 'rain' || f.condition === 'thunderstorm');
  const hasHot = forecast.some(f => f.tempMax >= 30);
  const hasCold = forecast.some(f => f.tempMin <= 10);
  const hasStorms = forecast.some(f => f.condition === 'thunderstorm');
  
  if (hasRain) {
    tips.push('Rain expected - pack an umbrella and waterproof jacket');
  }
  
  if (hasHot) {
    tips.push('Hot weather expected - stay hydrated and apply sunscreen frequently');
  }
  
  if (hasCold) {
    tips.push('Cool temperatures expected - bring warm layers');
  }
  
  if (hasStorms) {
    tips.push('Thunderstorms possible - avoid hiking during storms and check conditions daily');
  }
  
  return tips;
}
