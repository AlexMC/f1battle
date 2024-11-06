import React, { useEffect, useState, useCallback } from 'react';
import { Driver, IntervalData, PositionData } from '../types';
import { getTeamColor } from '../utils/colors';
import { LoadingSpinner } from './LoadingSpinner';
import { cacheUtils } from '../utils/cache';
import { apiQueue } from '../utils/apiQueue';
import { ApiIntervalResponse, ApiPositionResponse } from '../types/api';
import { findPositionAtTime } from '../utils/positions';
import { findDataAtTime } from '../utils/timing';
import { useDriverPosition } from '../hooks/useDriverPosition';

interface Props {
  sessionId: number;
  driver1: Driver;
  driver2: Driver;
  raceTime: number;
  isLiveSession: boolean;
  localTime: Date;
  sessionStartTime: Date;
}

const CACHE_KEY = {
  intervals: (sessionId: number, driverNumber: number) =>
    `f1_intervals_${sessionId}_${driverNumber}`,
  positions: (sessionId: number, driverNumber: number) =>
    `f1_positions_${sessionId}_${driverNumber}`
};

export const GapDisplay: React.FC<Props> = ({
  sessionId,
  driver1,
  driver2,
  raceTime,
  isLiveSession,
  localTime,
  sessionStartTime
}) => {
  const [intervalData, setIntervalData] = useState<{[key: number]: IntervalData[]}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentGap, setCurrentGap] = useState<ReturnType<typeof getCurrentGap>>(null);

  const driver1Position = useDriverPosition({
    sessionId,
    driver: driver1,
    raceTime,
    sessionStartTime
  });

  const driver2Position = useDriverPosition({
    sessionId,
    driver: driver2,
    raceTime,
    sessionStartTime
  });

  const getCurrentGap = useCallback(() => {
    const driver1Intervals = intervalData[driver1.driver_number] || [];
    const driver2Intervals = intervalData[driver2.driver_number] || [];

    if (!driver1Intervals.length || !driver2Intervals.length) return null;

    const driver1Interval = findDataAtTime(driver1Intervals, raceTime, sessionStartTime);
    const driver2Interval = findDataAtTime(driver2Intervals, raceTime, sessionStartTime);

    if (!driver1Interval || !driver2Interval) return null;

    const gap = Math.abs(driver1Interval.gap_to_leader - driver2Interval.gap_to_leader);

    if (gap === 0 || isNaN(gap)) return null;

    return {
      gap,
      ahead: driver1Interval.gap_to_leader < driver2Interval.gap_to_leader ? driver1 : driver2,
      behind: driver1Interval.gap_to_leader < driver2Interval.gap_to_leader ? driver2 : driver1,
      positions: {
        [driver1.driver_number]: driver1Position.currentPosition,
        [driver2.driver_number]: driver2Position.currentPosition
      }
    };
  }, [intervalData, driver1, driver2, raceTime, sessionStartTime, driver1Position, driver2Position]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchDataForDriver = async <T extends 'intervals' | 'positions'>(
          driver: Driver, 
          dataType: T
        ): Promise<T extends 'intervals' ? IntervalData[] : PositionData[]> => {
          const cacheKey = CACHE_KEY[dataType](sessionId, driver.driver_number);
          const cachedData = cacheUtils.get(cacheKey);
          
          if (cachedData) return cachedData as any;

          const endpoint = dataType === 'intervals' ? 'intervals' : 'position';
          const data = await apiQueue.enqueue<ApiIntervalResponse[] | ApiPositionResponse[]>(
            `/api/${endpoint}?session_key=${sessionId}&driver_number=${driver.driver_number}`
          );
          
          if (!isLiveSession) {
            cacheUtils.set(cacheKey, data, 24 * 60 * 60 * 1000);
          }
          
          return data as any;
        };

        const [
          driver1Intervals,
          driver2Intervals,
          driver1Positions,
          driver2Positions
        ] = await Promise.all([
          fetchDataForDriver(driver1, 'intervals'),
          fetchDataForDriver(driver2, 'intervals'),
          fetchDataForDriver(driver1, 'positions'),
          fetchDataForDriver(driver2, 'positions')
        ]);

        setIntervalData({
          [driver1.driver_number]: driver1Intervals as IntervalData[],
          [driver2.driver_number]: driver2Intervals as IntervalData[]
        });

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    };

    if (sessionId && driver1 && driver2) {
      fetchData();
    }

    let pollInterval: NodeJS.Timeout | null = null;
    if (isLiveSession) {
      pollInterval = setInterval(fetchData, 5000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [sessionId, driver1.driver_number, driver2.driver_number, isLiveSession]);

  useEffect(() => {
    const gap = getCurrentGap();
    setCurrentGap(gap);
  }, [localTime, intervalData, getCurrentGap]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!currentGap) return null;

  return (
    <div className="flex items-center justify-center gap-4 p-4 bg-gray-800 rounded-lg shadow-xl">
      <div className="flex items-center gap-2">
        <span className={`${getTeamColor(currentGap.behind.team_name)} font-semibold`}>
          {currentGap.behind.name_acronym}
        </span>
        <span className="text-gray-400 text-sm">
          P{currentGap.positions[currentGap.behind.driver_number]}
        </span>
      </div>
      <span className="text-gray-400">&gt;&gt;</span>
      <span className="font-mono text-white">
        {currentGap.gap.toFixed(3)}s
      </span>
      <span className="text-gray-400">&gt;&gt;</span>
      <div className="flex items-center gap-2">
        <span className={`${getTeamColor(currentGap.ahead.team_name)} font-semibold`}>
          {currentGap.ahead.name_acronym}
        </span>
        <span className="text-gray-400 text-sm">
          P{currentGap.positions[currentGap.ahead.driver_number]}
        </span>
      </div>
    </div>
  );
}; 