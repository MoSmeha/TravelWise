export interface ServiceResult<T> {
  data: T | null;
  source: 'live' | 'cache' | 'fallback' | 'unavailable';
  isStale: boolean;
  error?: string;
  lastUpdated?: Date | null;
}

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

export function errorResult<T>(error: string): ServiceResult<T> {
  return {
    data: null,
    source: 'unavailable',
    isStale: true,
    error,
    lastUpdated: null,
  };
}

export function cachedResult<T>(data: T, isStale = false): ServiceResult<T> {
  return {
    data,
    source: 'cache',
    isStale,
    lastUpdated: new Date(),
  };
}
