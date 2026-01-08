import NodeCache from 'node-cache';

// ==========================================
// CACHE SERVICE
// In-memory caching with TTL for external API responses
// ==========================================

// Cache configuration from environment or defaults
const CACHE_CONFIG = {
  stdTTL: parseInt(process.env.CACHE_TTL_WEATHER || '3600'), // 1 hour default
  checkperiod: 600, // Check for expired keys every 10 min
};

// Create cache instance
const cache = new NodeCache(CACHE_CONFIG);

// Cache key generators
export const CACHE_KEYS = {
  googlePlace: (placeId: string) => `gp:${placeId}`,
  googlePlaceSearch: (query: string, lat: number, lng: number) => 
    `gps:${query}:${lat.toFixed(3)},${lng.toFixed(3)}`,
  weather: (lat: number, lng: number) => `wx:${lat.toFixed(2)},${lng.toFixed(2)}`,
  weatherHistory: (lat: number, lng: number, month: number) => 
    `wxh:${lat.toFixed(2)},${lng.toFixed(2)}:${month}`,
};

// TTLs by data type (in seconds)
export const CACHE_TTL = {
  googlePlace: parseInt(process.env.CACHE_TTL_PLACES || '86400'), // 24 hours
  weather: parseInt(process.env.CACHE_TTL_WEATHER || '3600'), // 1 hour
  placeSearch: 604800, // 7 days
  weatherHistory: 2592000, // 30 days
};

// Generic cache get
export function cacheGet<T>(key: string): T | undefined {
  return cache.get<T>(key);
}

// Generic cache set
export function cacheSet<T>(key: string, value: T, ttl?: number): boolean {
  return cache.set(key, value, ttl || CACHE_CONFIG.stdTTL);
}

// Generic cache delete
export function cacheDelete(key: string): number {
  return cache.del(key);
}

// Check if key exists
export function cacheHas(key: string): boolean {
  return cache.has(key);
}

// Get TTL for a key (returns undefined if key doesn't exist)
export function cacheTTL(key: string): number | undefined {
  return cache.getTtl(key);
}

// Get cache stats
export function cacheStats(): NodeCache.Stats {
  return cache.getStats();
}

// Flush all cache
export function cacheFlush(): void {
  cache.flushAll();
}

// Get with fallback
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
