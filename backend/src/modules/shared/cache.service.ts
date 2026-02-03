import NodeCache from 'node-cache';



const CACHE_CONFIG = {
  stdTTL: parseInt(process.env.CACHE_TTL_WEATHER || '3600'),
  checkperiod: 600,
};


const cache = new NodeCache(CACHE_CONFIG);


export const CACHE_KEYS = {
  googlePlace: (placeId: string) => `gp:${placeId}`,
  googlePlaceSearch: (query: string, lat: number, lng: number) => 
    `gps:${query}:${lat.toFixed(3)},${lng.toFixed(3)}`,
  weather: (lat: number, lng: number) => `wx:${lat.toFixed(2)},${lng.toFixed(2)}`,
  weatherHistory: (lat: number, lng: number, month: number) => 
    `wxh:${lat.toFixed(2)},${lng.toFixed(2)}:${month}`,
  directions: (origin: string, dest: string, waypoints: string[]) =>
    `dir:${origin}:${dest}:${waypoints.join('|')}`,
};


export const CACHE_TTL = {
  googlePlace: parseInt(process.env.CACHE_TTL_PLACES || '86400'),
  weather: parseInt(process.env.CACHE_TTL_WEATHER || '3600'),
  placeSearch: 604800,
  weatherHistory: 2592000,
  directions: 604800,
};


export function cacheGet<T>(key: string): T | undefined {
  return cache.get<T>(key);
}


export function cacheSet<T>(key: string, value: T, ttl?: number): boolean {
  return cache.set(key, value, ttl || CACHE_CONFIG.stdTTL);
}


export function cacheDelete(key: string): number {
  return cache.del(key);
}


export function cacheHas(key: string): boolean {
  return cache.has(key);
}


export function cacheTTL(key: string): number | undefined {
  return cache.getTtl(key);
}


export function cacheStats(): NodeCache.Stats {
  return cache.getStats();
}


export function cacheFlush(): void {
  cache.flushAll();
}


export async function cacheGetOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<{ data: T; fromCache: boolean }> {
  const cached = cache.get<T>(key);
  
  if (cached !== undefined) {
    return { data: cached, fromCache: true };
  }
  
  const fresh = await fetchFn();
  cache.set(key, fresh, ttl || 0);
  
  return { data: fresh, fromCache: false };
}

export default cache;
