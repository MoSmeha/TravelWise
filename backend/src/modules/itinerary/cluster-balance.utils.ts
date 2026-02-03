import { calculateCentroid, haversineDistance } from '../shared/utils/geo.utils.js';

interface ClusterPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category?: string;
  suggestedDuration?: number;
}

/**
 * Balance clusters to ensure each day has close to the average number of activities.
 * Transfers activities from over-capacity clusters to under-capacity ones.
 */
export function balanceClusters(
  clusters: ClusterPlace[][],
  numberOfDays: number,
  startCoords: { lat: number; lng: number }
): ClusterPlace[][] {
  const totalActivities = clusters.reduce((sum, c) => sum + c.length, 0);
  const targetPerDay = Math.floor(totalActivities / numberOfDays);
  const MIN_PER_DAY = Math.max(3, targetPerDay - 1);
  const MAX_PER_DAY_CLUSTER = targetPerDay + 2;
  const MAX_ATTEMPTS = 30;
  let attempts = 0;
  let rebalanced = true;

  console.log(`[CLUSTER] Target per day: ${targetPerDay}, Min: ${MIN_PER_DAY}, Max: ${MAX_PER_DAY_CLUSTER}`);

  while (rebalanced && attempts < MAX_ATTEMPTS) {
    rebalanced = false;
    attempts++;

    let minLen = Infinity, maxLen = -Infinity;
    let minIdx = -1, maxIdx = -1;

    clusters.forEach((c, idx) => {
      if (c.length < minLen) { minLen = c.length; minIdx = idx; }
      if (c.length > maxLen) { maxLen = c.length; maxIdx = idx; }
    });

    // Transfer from over-capacity clusters to under-capacity clusters
    if (minIdx !== -1 && maxIdx !== -1 && (minLen < MIN_PER_DAY || maxLen > MAX_PER_DAY_CLUSTER)) {
      const receiverCentroid = clusters[minIdx].length > 0 ? calculateCentroid(clusters[minIdx]) : startCoords;

      let bestTransferIdx = -1;
      let bestTransferDist = Infinity;

      clusters[maxIdx].forEach((p, pIdx) => {
        const d = haversineDistance(p.latitude, p.longitude, receiverCentroid.lat, receiverCentroid.lng);
        if (d < bestTransferDist) {
          bestTransferDist = d;
          bestTransferIdx = pIdx;
        }
      });

      if (bestTransferIdx !== -1 && clusters[maxIdx].length > 1) {
        const item = clusters[maxIdx].splice(bestTransferIdx, 1)[0];
        clusters[minIdx].push(item);
        rebalanced = true;
      }
    }
  }

  console.log(`[CLUSTER] After rebalancing (${attempts} attempts): ${clusters.map(c => c.length).join(', ')}`);
  return clusters;
}
