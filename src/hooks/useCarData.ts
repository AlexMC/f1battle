import { useState, useEffect } from 'react';
import { CarData } from '../types';
import { redisCacheUtils } from '../utils/redisCache';
import { apiQueue } from '../utils/apiQueue';
import { findCarDataAtTime } from '../utils/carData';

const CHUNK_SIZE_MINUTES = 15;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

const CACHE_KEY = {
  carData: (sessionId: number, driverNumber: number) => 
    `f1_car_data_${sessionId}_${driverNumber}`,
  carDataChunk: (sessionId: number, driverNumber: number, startTime: string) =>
    `f1_car_data_${sessionId}_${driverNumber}_${startTime}`
};

export const useCarData = (
  sessionId: number,
  driverNumber: number,
  raceTime: number,
  sessionStartTime: Date
) => {
  const [carData, setCarData] = useState<CarData[]>([]);
  const [currentData, setCurrentData] = useState<CarData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCarDataChunk = async (startTime: Date, endTime: Date, retryCount = 0) => {
      try {
        const startISO = startTime.toISOString();
        const endISO = endTime.toISOString();
        
        return await apiQueue.enqueue<CarData[]>(
          `/api/car_data?session_key=${sessionId}&driver_number=${driverNumber}&date>${startISO}&date<${endISO}`
        );
      } catch (error) {
        if (retryCount < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return fetchCarDataChunk(startTime, endTime, retryCount + 1);
        }
        throw error;
      }
    };

    const fetchCarData = async () => {
      if (!sessionId || !driverNumber || !sessionStartTime) return;

      try {
        // Create time chunks
        const chunks: { startTime: Date; endTime: Date }[] = [];
        let currentStartTime = new Date(sessionStartTime);

        for (let i = 0; i < Math.ceil(180 / CHUNK_SIZE_MINUTES); i++) {
          const endTime = new Date(currentStartTime.getTime() + CHUNK_SIZE_MINUTES * 60 * 1000);
          chunks.push({ startTime: currentStartTime, endTime });
          currentStartTime = endTime;
        }

        let allData: CarData[] = [];
        
        // Fetch chunks sequentially
        for (const chunk of chunks) {
          const chunkCacheKey = CACHE_KEY.carDataChunk(
            sessionId, 
            driverNumber, 
            chunk.startTime.toISOString()
          );
          
          const cachedChunk = await redisCacheUtils.get<CarData[]>(chunkCacheKey);

          if (cachedChunk) {
            allData = [...allData, ...cachedChunk];
            continue;
          }

          const chunkData = await fetchCarDataChunk(chunk.startTime, chunk.endTime);
          
          if (chunkData.length === 0) {
            break;
          }

          await redisCacheUtils.set(chunkCacheKey, chunkData, 24 * 60 * 60 * 1000);
          allData = [...allData, ...chunkData];
        }

        // Cache the complete dataset
        const cacheKey = CACHE_KEY.carData(sessionId, driverNumber);
        await redisCacheUtils.set(cacheKey, allData, 24 * 60 * 60 * 1000);
        setCarData(allData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching car data:', error);
        setIsLoading(false);
      }
    };

    fetchCarData();
  }, [sessionId, driverNumber, sessionStartTime]);

  useEffect(() => {
    const data = findCarDataAtTime(carData, raceTime, sessionStartTime);
    setCurrentData(data);
  }, [carData, raceTime, sessionStartTime]);

  return { currentData, isLoading };
}; 