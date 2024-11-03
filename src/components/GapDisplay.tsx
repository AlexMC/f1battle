import React, { useEffect, useState } from 'react';
import { Driver, IntervalData } from '../types';
import { getTeamColor } from '../utils/colors';
import { LoadingSpinner } from './LoadingSpinner';

interface Props {
  sessionId: number;
  driver1: Driver;
  driver2: Driver;
  raceTime: number;
  isLiveSession: boolean;
}

export const GapDisplay: React.FC<Props> = ({
  sessionId,
  driver1,
  driver2,
  raceTime,
  isLiveSession
}) => {
  const [intervalData, setIntervalData] = useState<{
    [key: number]: IntervalData[]
  }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchIntervalData = async () => {
      try {
        const [driver1Data, driver2Data] = await Promise.all([
          fetch(`/api/intervals?session_key=${sessionId}&driver_number=${driver1.driver_number}`),
          fetch(`/api/intervals?session_key=${sessionId}&driver_number=${driver2.driver_number}`)
        ]);

        const [driver1Intervals, driver2Intervals] = await Promise.all([
          driver1Data.json(),
          driver2Data.json()
        ]);

        setIntervalData({
          [driver1.driver_number]: driver1Intervals,
          [driver2.driver_number]: driver2Intervals
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching interval data:', error);
        setIsLoading(false);
      }
    };

    if (sessionId && driver1 && driver2) {
      fetchIntervalData();
    }

    // Set up polling for live sessions
    let pollInterval: number | null = null;
    if (isLiveSession) {
      pollInterval = setInterval(fetchIntervalData, 5000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [sessionId, driver1.driver_number, driver2.driver_number, isLiveSession]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const getCurrentGap = () => {
    const driver1Intervals = intervalData[driver1.driver_number] || [];
    const driver2Intervals = intervalData[driver2.driver_number] || [];

    if (!driver1Intervals.length || !driver2Intervals.length) return null;

    // For live sessions, get the latest interval
    if (isLiveSession) {
      const latestDriver1 = driver1Intervals[driver1Intervals.length - 1];
      const latestDriver2 = driver2Intervals[driver2Intervals.length - 1];
      const gap = Math.abs(latestDriver1.gap_to_leader - latestDriver2.gap_to_leader);
      return {
        gap,
        ahead: latestDriver1.gap_to_leader < latestDriver2.gap_to_leader ? driver1 : driver2,
        behind: latestDriver1.gap_to_leader < latestDriver2.gap_to_leader ? driver2 : driver1
      };
    }

    // For replay, find the appropriate interval based on race time
    const findIntervalAtTime = (intervals: IntervalData[], targetTime: number) => {
      const sessionStart = new Date(intervals[0].date).getTime();
      const targetDate = new Date(sessionStart + targetTime * 1000).getTime();
      
      // Find the last interval before or at the target time
      return intervals.reduce((closest, current) => {
        const intervalDate = new Date(current.date).getTime();
        if (intervalDate <= targetDate) return current;
        return closest;
      }, intervals[intervals.length - 1]);
    };

    const driver1Interval = findIntervalAtTime(driver1Intervals, raceTime);
    const driver2Interval = findIntervalAtTime(driver2Intervals, raceTime);

    if (!driver1Interval || !driver2Interval) return null;

    const gap = Math.abs(driver1Interval.gap_to_leader - driver2Interval.gap_to_leader);
    return {
      gap,
      ahead: driver1Interval.gap_to_leader < driver2Interval.gap_to_leader ? driver1 : driver2,
      behind: driver1Interval.gap_to_leader < driver2Interval.gap_to_leader ? driver2 : driver1
    };
  };

  const gapInfo = getCurrentGap();

  if (!gapInfo) return null;

  return (
    <div className="flex items-center justify-center gap-4 p-4 bg-gray-800 rounded-lg shadow-xl">
      <span className={`${getTeamColor(gapInfo.behind.team_name)} font-semibold`}>
        {gapInfo.behind.name_acronym}
      </span>
      <span className="text-gray-400">&gt;&gt;</span>
      <span className="font-mono text-white">
        {gapInfo.gap.toFixed(3)}s
      </span>
      <span className="text-gray-400">&gt;&gt;</span>
      <span className={`${getTeamColor(gapInfo.ahead.team_name)} font-semibold`}>
        {gapInfo.ahead.name_acronym}
      </span>
    </div>
  );
}; 