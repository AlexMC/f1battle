import React, { useEffect, useState, useCallback } from 'react';
import { Driver, IntervalData, PositionData } from '../types';
import { getTeamColor } from '../utils/colors';
import { LoadingSpinner } from './LoadingSpinner';
import { cacheUtils } from '../utils/cache';

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
  const [positionData, setPositionData] = useState<{[key: number]: PositionData[]}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentGap, setCurrentGap] = useState<ReturnType<typeof getCurrentGap>>(null);

  const findDataAtTime = <T extends IntervalData | PositionData>(
    data: T[],
    raceTime: number,
    sessionStartTime: Date
  ): T | null => {
    if (!data.length) return null;
    
    const sortedData = [...data].sort((a, b) => {
      const timeA = new Date(a.date.replace('+00:00', 'Z')).getTime() - sessionStartTime.getTime();
      const timeB = new Date(b.date.replace('+00:00', 'Z')).getTime() - sessionStartTime.getTime();
      return timeA - timeB;
    });

    let closestData = sortedData[0];
    let minTimeDiff = Math.abs(
      (new Date(closestData.date.replace('+00:00', 'Z')).getTime() - sessionStartTime.getTime()) / 1000 - raceTime
    );

    for (const item of sortedData) {
      const itemTime = (new Date(item.date.replace('+00:00', 'Z')).getTime() - sessionStartTime.getTime()) / 1000;
      const timeDiff = Math.abs(itemTime - raceTime);
      
      if (timeDiff < minTimeDiff) {
        minTimeDiff = timeDiff;
        closestData = item;
      }
    }
    
    return closestData;
  };

  const getCurrentGap = useCallback(() => {
    const driver1Intervals = intervalData[driver1.driver_number] || [];
    const driver2Intervals = intervalData[driver2.driver_number] || [];
    const driver1Positions = positionData[driver1.driver_number] || [];
    const driver2Positions = positionData[driver2.driver_number] || [];

    if (!driver1Intervals.length || !driver2Intervals.length) return null;

    const driver1Interval = findDataAtTime(driver1Intervals, raceTime, sessionStartTime);
    const driver2Interval = findDataAtTime(driver2Intervals, raceTime, sessionStartTime);
    const driver1Position = findDataAtTime(driver1Positions, raceTime, sessionStartTime);
    const driver2Position = findDataAtTime(driver2Positions, raceTime, sessionStartTime);

    if (!driver1Interval || !driver2Interval) return null;

    const gap = Math.abs(driver1Interval.gap_to_leader - driver2Interval.gap_to_leader);

    if (gap === 0 || isNaN(gap)) return null;

    return {
      gap,
      ahead: driver1Interval.gap_to_leader < driver2Interval.gap_to_leader ? driver1 : driver2,
      behind: driver1Interval.gap_to_leader < driver2Interval.gap_to_leader ? driver2 : driver1,
      positions: {
        [driver1.driver_number]: driver1Position?.position,
        [driver2.driver_number]: driver2Position?.position
      }
    };
  }, [intervalData, positionData, driver1, driver2, raceTime, sessionStartTime]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const fetchDataForDriver = async (driver: Driver, dataType: 'intervals' | 'positions') => {
          const cacheKey = CACHE_KEY[dataType](sessionId, driver.driver_number);
          const cachedData = cacheUtils.get(cacheKey);
          
          if (cachedData) return cachedData;

          const endpoint = dataType === 'intervals' ? 'intervals' : 'position';
          const response = await fetch(`/api/${endpoint}?session_key=${sessionId}&driver_number=${driver.driver_number}`);
          const data = await response.json();
          
          if (!isLiveSession) {
            cacheUtils.set(cacheKey, data, 24 * 60 * 60 * 1000);
          }
          
          return data;
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
          [driver1.driver_number]: driver1Intervals || [],
          [driver2.driver_number]: driver2Intervals || []
        });

        setPositionData({
          [driver1.driver_number]: driver1Positions || [],
          [driver2.driver_number]: driver2Positions || []
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
  }, [localTime, intervalData, positionData, getCurrentGap]);

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