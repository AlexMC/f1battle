import { useState, useEffect } from 'react';
import { Driver, PositionData } from '../types';
import { findPositionAtTime } from '../utils/positions';
import { apiQueue } from '../utils/apiQueue';
import { ApiPositionResponse } from '../types/api';
import { mapApiPositionToPositionData } from '../utils/apiMappers';
import { redisCacheUtils } from '../utils/redisCache';

interface UseDriverPositionProps {
  sessionId: number;
  driver: Driver;
  raceTime: number;
  sessionStartTime: Date;
}

const CACHE_KEY = {
  positions: (sessionId: number, driverNumber: number) => 
    `f1_positions_${sessionId}_${driverNumber}`
};

export const useDriverPosition = ({ 
  sessionId, 
  driver, 
  raceTime, 
  sessionStartTime 
}: UseDriverPositionProps) => {
  const [positionData, setPositionData] = useState<PositionData[]>([]);
  const [currentPosition, setCurrentPosition] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPositionData = async () => {
      if (!sessionId || !driver) return;

      try {
        // Try database first
        try {
          const dbResponse = await fetch(`/db/position/${sessionId}/${driver.driver_number}`);
          if (dbResponse.ok) {
            const dbData = await dbResponse.json();
            if (dbData.length > 0) {
              setPositionData(dbData);
              setIsLoading(false);
              return;
            }
          }
        } catch (error) {
          console.log('Database fetch failed, trying cache...');
        }

        // If not in DB, try cache
        console.log(`Fetching position data from cache for session ${sessionId} and driver ${driver.driver_number}`);
        const cacheKey = CACHE_KEY.positions(sessionId, driver.driver_number);
        const cachedData = await redisCacheUtils.get<PositionData[]>(cacheKey);
        
        if (cachedData) {
          setPositionData(cachedData);
          setIsLoading(false);
          return;
        }

        // If not in cache, fetch from API
        console.log(`Fetching position data from API for session ${sessionId} and driver ${driver.driver_number}`);
        const data = await apiQueue.enqueue<ApiPositionResponse[]>(
          `/api/position?session_key=${sessionId}&driver_number=${driver.driver_number}`
        );
        const mappedData = data.map(pos => mapApiPositionToPositionData(pos, sessionId));
        
        // Cache the results
        await redisCacheUtils.set(cacheKey, mappedData, 24 * 60 * 60 * 1000);
        
        setPositionData(mappedData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching position data:', error);
        setIsLoading(false);
      }
    };

    fetchPositionData();
  }, [sessionId, driver]);

  useEffect(() => {
    const position = findPositionAtTime(positionData, raceTime, sessionStartTime) || 0;
    setCurrentPosition(position);
  }, [positionData, raceTime, sessionStartTime]);

  return { currentPosition, isLoading };
}; 