/**
 * Standardized API result types
 * Used across all services for consistent response handling
 */

/**
 * Generic service result wrapper
 * Provides consistent structure for all external API responses
 */
export interface ServiceResult<T> {
  data: T | null;
  source: 'live' | 'cache' | 'fallback' | 'unavailable';
  isStale: boolean;
  error?: string;
  lastUpdated?: Date | null;
}

/**
 * Create a successful result
 */
export function successResult<T>(
  data: T,
  source: ServiceResult<T>['source'] = 'live'
): ServiceResult<T> {
  return {
    data,
    source,
    isStale: false,
    lastUpdated: new Date(),
  };
}

/**
 * Create an error/unavailable result
 */
export function errorResult<T>(error: string): ServiceResult<T> {
  return {
    data: null,
    source: 'unavailable',
    isStale: true,
    error,
    lastUpdated: null,
  };
}

/**
 * Create a cached result
 */
export function cachedResult<T>(data: T, isStale = false): ServiceResult<T> {
  return {
    data,
    source: 'cache',
    isStale,
    lastUpdated: new Date(),
  };
}
