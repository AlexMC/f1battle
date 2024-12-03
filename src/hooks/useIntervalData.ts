import { useState, useEffect } from 'react';
import { IntervalData } from '../types';
import { redisCacheUtils } from '../utils/redisCache';
import { apiQueue } from '../utils/apiQueue';
import { ApiIntervalResponse } from '../types/api';

const CACHE_KEY = (sessionId: number, driverNumber: number) =>
  `f1_intervals_${sessionId}_${driverNumber}`;

const mapApiIntervalToIntervalData = (
  interval: ApiIntervalResponse, 
  sessionId: number
): IntervalData => ({
  session_key: sessionId,
  meeting_key: Math.floor(sessionId / 100),
  driver_number: interval.driver_number,
  gap_to_leader: interval.gap_to_leader || 0,
  interval: interval.interval || 0,
  date: interval.date
});

interface UseIntervalDataProps {
  sessionId: number;
  driverNumber: number;
  isLiveSession: boolean;
}

export const useIntervalData = ({ 
  sessionId, 
  driverNumber,
  isLiveSession 
}: UseIntervalDataProps) => {
  const [intervalData, setIntervalData] = useState<IntervalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIntervalData = async () => {
      if (!sessionId || !driverNumber) return;

      try {
        // Try database first
        try {
          const dbResponse = await fetch(`/db/intervals/${sessionId}/${driverNumber}`);
          if (dbResponse.ok) {
            const dbData = await dbResponse.json();
            if (dbData.length > 0) {
              setIntervalData(dbData);
              setIsLoading(false);
              return;
            }
          }
        } catch (error) {
          console.log('Database fetch failed, trying cache...');
        }

        // If not in DB, try cache
        const cacheKey = CACHE_KEY(sessionId, driverNumber);
        const cachedData = await redisCacheUtils.get<IntervalData[]>(cacheKey);
        
        if (cachedData) {
          setIntervalData(cachedData);
          setIsLoading(false);
          return;
        }

        // If not in cache, fetch from API
        const apiData = await apiQueue.enqueue<ApiIntervalResponse[]>(
          `/api/intervals?session_key=${sessionId}&driver_number=${driverNumber}`
        );
        
        const mappedData = apiData.map(interval => 
          mapApiIntervalToIntervalData(interval, sessionId)
        );
        
        // Cache the results if not a live session
        if (!isLiveSession && mappedData.length > 0) {
          await redisCacheUtils.set(cacheKey, mappedData, 24 * 60 * 60 * 1000);
        }
        
        setIntervalData(mappedData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching interval data:', error);
        setIsLoading(false);
      }
    };

    fetchIntervalData();

    let pollInterval: NodeJS.Timeout | null = null;
    if (isLiveSession) {
      pollInterval = setInterval(fetchIntervalData, 5000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [sessionId, driverNumber, isLiveSession]);

  return { intervalData, isLoading };
}; 