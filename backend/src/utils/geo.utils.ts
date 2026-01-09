/**
 * Geographic utility functions
 * Shared calculations for distance and coordinate operations
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians
 */
export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate the centroid (average point) of multiple coordinates
 */
export function calculateCentroid(
  points: Array<{ latitude: number; longitude: number }>
): { lat: number; lng: number } {
  if (points.length === 0) {
    return { lat: 0, lng: 0 };
  }

  const sumLat = points.reduce((sum, p) => sum + p.latitude, 0);
  const sumLng = points.reduce((sum, p) => sum + p.longitude, 0);

  return {
    lat: sumLat / points.length,
    lng: sumLng / points.length,
  };
}
