
import { haversineDistance } from '../utils/geo.utils.js';

interface Coordinate {
  lat: number;
  lng: number;
}

interface PlaceWithCoords {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  activityTypes?: string[];
  category?: string;
  suggestedDuration?: number; // minutes
}

interface DayRoute {
  dayNumber: number;
  places: PlaceWithCoords[];
  totalDistanceKm: number;
  estimatedTravelMinutes: number;
  routePolyline: Coordinate[];
}

interface OptimizedRoute {
  days: DayRoute[];
  totalDistanceKm: number;
  totalTravelMinutes: number;
  startPoint: Coordinate;
}




function estimateTravelTime(distanceKm: number): number {
  // Average speed assumption: 30 km/h in cities, 50 km/h between cities
  // Use conservative estimate of 25 km/h average considering traffic
  const averageSpeedKmH = 25;
  return Math.ceil((distanceKm / averageSpeedKmH) * 60); // minutes
}


function calculateCentroid(places: PlaceWithCoords[]): Coordinate {
  if (places.length === 0) return { lat: 0, lng: 0 };
  
  const sumLat = places.reduce((sum, p) => sum + p.latitude, 0);
  const sumLng = places.reduce((sum, p) => sum + p.longitude, 0);
  
  return {
    lat: sumLat / places.length,
    lng: sumLng / places.length,
  };
}


export function kMeansClustering(
  places: PlaceWithCoords[],
  k: number,
  maxIterations: number = 50
): PlaceWithCoords[][] {
  if (places.length <= k) {

    return places.map(p => [p]);
  }
  

  const centroids: Coordinate[] = [];
  const usedIndices = new Set<number>();
  
  while (centroids.length < k) {
    const idx = Math.floor(Math.random() * places.length);
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx);
      centroids.push({ lat: places[idx].latitude, lng: places[idx].longitude });
    }
  }
  
  let clusters: PlaceWithCoords[][] = [];
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {

    clusters = Array.from({ length: k }, () => []);
    
    for (const place of places) {
      let minDist = Infinity;
      let closestCluster = 0;
      
      for (let i = 0; i < k; i++) {
        const dist = haversineDistance(
          place.latitude, place.longitude,
          centroids[i].lat, centroids[i].lng
        );
        if (dist < minDist) {
          minDist = dist;
          closestCluster = i;
        }
      }
      
      clusters[closestCluster].push(place);
    }
    

    let converged = true;
    for (let i = 0; i < k; i++) {
      if (clusters[i].length > 0) {
        const newCentroid = calculateCentroid(clusters[i]);
        const movement = haversineDistance(
          centroids[i].lat, centroids[i].lng,
          newCentroid.lat, newCentroid.lng
        );
        
        if (movement > 0.1) { // More than 100m movement
          converged = false;
        }
        
        centroids[i] = newCentroid;
      }
    }
    
    if (converged) break;
  }
  

  return clusters.filter(c => c.length > 0);
}


function nearestNeighborRoute(
  places: PlaceWithCoords[],
  startPoint: Coordinate
): PlaceWithCoords[] {
  if (places.length <= 1) return places;
  
  const route: PlaceWithCoords[] = [];
  const remaining = [...places];
  

  let currentPoint = startPoint;
  
  while (remaining.length > 0) {
    let minDist = Infinity;
    let closestIdx = 0;
    
    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineDistance(
        currentPoint.lat, currentPoint.lng,
        remaining[i].latitude, remaining[i].longitude
      );
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }
    
    const nextPlace = remaining.splice(closestIdx, 1)[0];
    route.push(nextPlace);
    currentPoint = { lat: nextPlace.latitude, lng: nextPlace.longitude };
  }
  
  return route;
}


function calculateRouteDistance(places: PlaceWithCoords[]): number {
  if (places.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 0; i < places.length - 1; i++) {
    totalDistance += haversineDistance(
      places[i].latitude, places[i].longitude,
      places[i + 1].latitude, places[i + 1].longitude
    );
  }
  
  return totalDistance;
}


function generateTimeBlocks(
  places: PlaceWithCoords[],
  startTime: string = '09:00'
): { place: PlaceWithCoords; startTime: string; endTime: string; travelFromPrev: number }[] {
  const blocks = [];
  

  const [startHour, startMin] = startTime.split(':').map(Number);
  let currentMinutes = startHour * 60 + startMin;
  
  for (let i = 0; i < places.length; i++) {
    const place = places[i];
    

    let travelFromPrev = 0;
    if (i > 0) {
      const dist = haversineDistance(
        places[i - 1].latitude, places[i - 1].longitude,
        place.latitude, place.longitude
      );
      travelFromPrev = estimateTravelTime(dist);
      currentMinutes += travelFromPrev;
    }
    
    const blockStartTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`;
    

    const duration = place.suggestedDuration || 90;
    currentMinutes += duration;
    
    const blockEndTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`;
    
    blocks.push({
      place,
      startTime: blockStartTime,
      endTime: blockEndTime,
      travelFromPrev,
    });
  }
  
  return blocks;
}


function orderClustersByProximity(
  clusters: PlaceWithCoords[][],
  startPoint: Coordinate
): PlaceWithCoords[][] {
  if (clusters.length <= 1) return clusters;
  
  const ordered: PlaceWithCoords[][] = [];
  const remaining = [...clusters];
  let currentPoint = startPoint;
  
  while (remaining.length > 0) {
    let minDist = Infinity;
    let closestIdx = 0;
    
    for (let i = 0; i < remaining.length; i++) {
      const centroid = calculateCentroid(remaining[i]);
      const dist = haversineDistance(
        currentPoint.lat, currentPoint.lng,
        centroid.lat, centroid.lng
      );
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }
    
    const nextCluster = remaining.splice(closestIdx, 1)[0];
    ordered.push(nextCluster);
    currentPoint = calculateCentroid(nextCluster);
  }
  
  return ordered;
}


export function optimizeRoute(
  places: PlaceWithCoords[],
  numberOfDays: number,
  startPoint: Coordinate,
  placesPerDay: number = 4
): OptimizedRoute {
  if (places.length === 0) {
    return {
      days: [],
      totalDistanceKm: 0,
      totalTravelMinutes: 0,
      startPoint,
    };
  }
  

  const k = Math.min(numberOfDays, Math.ceil(places.length / placesPerDay));
  

  let clusters = kMeansClustering(places, k);
  

  clusters = orderClustersByProximity(clusters, startPoint);
  

  const days: DayRoute[] = [];
  let totalDistance = 0;
  let totalTravelMinutes = 0;
  
  let previousEndPoint = startPoint;
  
  for (let dayIndex = 0; dayIndex < clusters.length; dayIndex++) {
    const cluster = clusters[dayIndex];
    

    const optimizedPlaces = nearestNeighborRoute(cluster, previousEndPoint);
    

    const dayDistance = calculateRouteDistance(optimizedPlaces);
    

    if (optimizedPlaces.length > 0) {
      const distToFirst = haversineDistance(
        previousEndPoint.lat, previousEndPoint.lng,
        optimizedPlaces[0].latitude, optimizedPlaces[0].longitude
      );
      totalDistance += distToFirst;
    }
    
    totalDistance += dayDistance;
    const dayTravelMinutes = estimateTravelTime(dayDistance);
    totalTravelMinutes += dayTravelMinutes;
    

    const routePolyline: Coordinate[] = optimizedPlaces.map(p => ({
      lat: p.latitude,
      lng: p.longitude,
    }));
    
    days.push({
      dayNumber: dayIndex + 1,
      places: optimizedPlaces,
      totalDistanceKm: Math.round(dayDistance * 10) / 10,
      estimatedTravelMinutes: dayTravelMinutes,
      routePolyline,
    });
    

    if (optimizedPlaces.length > 0) {
      const lastPlace = optimizedPlaces[optimizedPlaces.length - 1];
      previousEndPoint = { lat: lastPlace.latitude, lng: lastPlace.longitude };
    }
  }
  
  return {
    days,
    totalDistanceKm: Math.round(totalDistance * 10) / 10,
    totalTravelMinutes,
    startPoint,
  };
}



export {
    calculateCentroid, calculateRouteDistance, estimateTravelTime, generateTimeBlocks, haversineDistance, nearestNeighborRoute, orderClustersByProximity
};

