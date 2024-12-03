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
  if (!sessionId || !driverNumber) {
    console.log('[Debug] Missing sessionId or driverNumber:', { sessionId, driverNumber });
    throw new Error('Session ID and Driver Number are required');
  }

  // Check cache first
  const cached = await redisCacheUtils.get(CACHE_KEY(sessionId));
  if (cached) {
    console.log('[Debug] Using cached scaling factors');
    return cached as TrackScalingFactors;
  }

  let locations: LocationData[] = [];

  // Try database first
  try {
    console.log(`[Debug] Fetching location data from DB for session ${sessionId} and driver ${driverNumber}`);
    const dbResponse = await fetch(`/db/location/${sessionId}/${driverNumber}`);
    if (dbResponse.ok) {
      const dbData = await dbResponse.json();
      console.log(`[Debug] DB response status: ${dbResponse.status}, data length: ${dbData.length}`);
      if (dbData.length > 0) {
        locations = dbData;
        console.log('[Debug] Using database data for scaling factors');
      } else {
        console.log('[Debug] No location data in database');
      }
    } else {
      console.log(`[Debug] DB response not OK: ${dbResponse.status}`);
    }
  } catch (error) {
    console.log('[Debug] Database fetch failed:', error);
  }

  // If no data in database, fetch from API
  if (locations.length === 0) {
    console.log('[Debug] Falling back to API for scaling factors');
    locations = await apiQueue.enqueue<LocationData[]>(
      `/api/location?session_key=${sessionId}&driver_number=${driverNumber}`
    );
  }

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
