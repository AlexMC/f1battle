import React, { useEffect, useState } from 'react';
import { Driver, IntervalData, PositionData } from '../types';
import { getTeamColor } from '../utils/colors';
import { LoadingSpinner } from './LoadingSpinner';
import { findDataAtTime } from '../utils/timing';
import { useDriverPosition } from '../hooks/useDriverPosition';
import { useIntervalData } from '../hooks/useIntervalData';

interface Props {
  sessionId: number;
  driver1: Driver;
  driver2: Driver;
  raceTime: number;
  isLiveSession: boolean;
  localTime: Date;
  sessionStartTime: Date;
}

interface GapData {
  gap: number;
  ahead: Driver;
  behind: Driver;
  positions: {
    [key: number]: number;
  };
}

export const GapDisplay: React.FC<Props> = ({
  sessionId,
  driver1,
  driver2,
  raceTime,
  isLiveSession,
  localTime,
  sessionStartTime
}) => {
  const [currentGap, setCurrentGap] = useState<GapData | null>(null);

  const { intervalData: driver1Intervals, isLoading: isLoadingDriver1 } = useIntervalData({
    sessionId,
    driverNumber: driver1.driver_number,
    isLiveSession
  });

  const { intervalData: driver2Intervals, isLoading: isLoadingDriver2 } = useIntervalData({
    sessionId,
    driverNumber: driver2.driver_number,
    isLiveSession
  });

  const { currentPosition: driver1CurrentPosition } = useDriverPosition({
    sessionId,
    driver: driver1,
    raceTime,
    sessionStartTime
  });

  const { currentPosition: driver2CurrentPosition } = useDriverPosition({
    sessionId,
    driver: driver2,
    raceTime,
    sessionStartTime
  });

  useEffect(() => {
    const calculateCurrentGap = () => {
      if (!driver1Intervals?.length || !driver2Intervals?.length) return null;

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
          [driver1.driver_number]: driver1CurrentPosition,
          [driver2.driver_number]: driver2CurrentPosition
        }
      };
    };

    const gap = calculateCurrentGap();
    setCurrentGap(gap);
  }, [
    localTime,
    driver1Intervals,
    driver2Intervals,
    driver1,
    driver2,
    raceTime,
    sessionStartTime,
    driver1CurrentPosition,
    driver2CurrentPosition
  ]);

  if (isLoadingDriver1 || isLoadingDriver2) {
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