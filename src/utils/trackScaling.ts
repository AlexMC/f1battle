import { LocationData } from '../types';
import { redisCacheUtils } from './redisCache';
import { apiQueue } from './apiQueue';

interface TrackScalingFactors {
  centerX: number;
  centerY: number;
  maxRange: number;
}

const CACHE_KEY = (sessionId: number) => `track_scaling_${sessionId}`;

export const calculateTrackScalingFactors = async (sessionId: number, driverNumber: number): Promise<TrackScalingFactors> => {
  // Check cache first
  const cached = await redisCacheUtils.get(CACHE_KEY(sessionId));
  if (cached) return cached as TrackScalingFactors;

  // Fetch all locations for the driver
  const locations = await apiQueue.enqueue<LocationData[]>(
    `/api/location?session_key=${sessionId}&driver_number=${driverNumber}`
  );

  // Filter valid coordinates
  const xValues = locations.map(p => p.x).filter(x => typeof x === 'number' && !isNaN(x));
  const yValues = locations.map(p => p.y).filter(y => typeof y === 'number' && !isNaN(y));

  if (xValues.length === 0 || yValues.length === 0) {
    throw new Error('No valid location data found');
  }

  const centerX = (Math.min(...xValues) + Math.max(...xValues)) / 2;
  const centerY = (Math.min(...yValues) + Math.max(...yValues)) / 2;
  const rangeX = Math.max(...xValues) - Math.min(...xValues);
  const rangeY = Math.max(...yValues) - Math.min(...yValues);
  const maxRange = Math.max(rangeX, rangeY);

  const scalingFactors = { centerX, centerY, maxRange };

  // Cache the results (1 week TTL)
  await redisCacheUtils.set(CACHE_KEY(sessionId), scalingFactors, 7 * 24 * 60 * 60 * 1000);

  return scalingFactors;
};
