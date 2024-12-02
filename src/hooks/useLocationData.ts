import { useState, useEffect } from 'react';
import { LocationData } from '../types';
import { apiQueue } from '../utils/apiQueue';
import { redisCacheUtils } from '../utils/redisCache';

const CHUNK_SIZE_MINUTES = 15;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const CACHE_KEY = {
  locationData: (sessionId: number, driverNumber: number) => 
    `f1_location_${sessionId}_${driverNumber}`,
  locationDataChunk: (sessionId: number, driverNumber: number, startTime: string) =>
    `f1_location_chunk_${sessionId}_${driverNumber}_${startTime}`
};

export const useLocationData = (
  sessionId: number,
  driverNumber: number,
  raceTime: number,
  sessionStartTime: Date
) => {
  const [locationData, setLocationData] = useState<LocationData[]>([]);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLocationDataChunk = async (startTime: Date, endTime: Date, retryCount = 0) => {
      try {
        const startISO = startTime.toISOString();
        const endISO = endTime.toISOString();
        
        // Try database first
        try {
          const dbResponse = await fetch(
            `/db/location/${sessionId}/${driverNumber}?start=${startISO}&end=${endISO}`
          );
          if (dbResponse.ok) {
            const dbData = await dbResponse.json();
            if (dbData.length > 0) {
              return dbData;
            }
          }
        } catch (error) {
          console.log('Database fetch failed, trying API...');
        }
        
        return await apiQueue.enqueue<LocationData[]>(
          `/api/location?session_key=${sessionId}&driver_number=${driverNumber}&date>${startISO}&date<${endISO}`
        );
      } catch (error) {
        if (retryCount < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return fetchLocationDataChunk(startTime, endTime, retryCount + 1);
        }
        throw error;
      }
    };

    const fetchLocationData = async () => {
      if (!sessionId || !driverNumber || !sessionStartTime) return;

      try {
        const chunks: { startTime: Date; endTime: Date }[] = [];
        let currentStartTime = new Date(sessionStartTime);

        for (let i = 0; i < Math.ceil(180 / CHUNK_SIZE_MINUTES); i++) {
          const endTime = new Date(currentStartTime.getTime() + CHUNK_SIZE_MINUTES * 60 * 1000);
          chunks.push({ startTime: currentStartTime, endTime });
          currentStartTime = endTime;
        }

        let allData: LocationData[] = [];
        
        for (const chunk of chunks) {
          const chunkCacheKey = CACHE_KEY.locationDataChunk(
            sessionId, 
            driverNumber, 
            chunk.startTime.toISOString()
          );
          
          const cachedChunk = await redisCacheUtils.get<LocationData[]>(chunkCacheKey);

          if (cachedChunk) {
            allData = [...allData, ...cachedChunk];
            continue;
          }

          const chunkData = await fetchLocationDataChunk(chunk.startTime, chunk.endTime);
          
          if (chunkData.length === 0) {
            break;
          }

          await redisCacheUtils.set(chunkCacheKey, chunkData, 24 * 60 * 60 * 1000);
          allData = [...allData, ...chunkData];
        }

        const cacheKey = CACHE_KEY.locationData(sessionId, driverNumber);
        await redisCacheUtils.set(cacheKey, allData, 24 * 60 * 60 * 1000);
        setLocationData(allData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching location data:', error);
        setIsLoading(false);
      }
    };

    fetchLocationData();
  }, [sessionId, driverNumber, sessionStartTime]);

  useEffect(() => {
    if (!locationData.length || !sessionStartTime) return;

    const currentTime = raceTime * 1000;
    const location = locationData.find(loc => {
      const locTime = new Date(loc.date.replace('+00:00', 'Z')).getTime() - sessionStartTime.getTime();
      return Math.abs(locTime - currentTime) < 500; // Within 500ms
    });

    setCurrentLocation(location || null);
  }, [locationData, raceTime, sessionStartTime]);

  return { currentLocation, isLoading };
}; 