import React, { useState, useEffect } from 'react';
import { Driver, PositionData } from '../types';
import { getTeamColor } from '../utils/colors';
import { LoadingSpinner } from './LoadingSpinner';
import { cacheUtils } from '../utils/cache';
import { apiQueue } from '../utils/apiQueue';
import { ApiPositionResponse } from '../types/api';
import { findPositionAtTime } from '../utils/positions';
import { mapApiPositionToPositionData } from '../utils/apiMappers';

interface Props {
  sessionId: number;
  drivers: Driver[];
  isLoading: boolean;
  raceTime: number;
  sessionStartTime: Date;
}

interface GridPosition {
  position: number;
  driver: Driver;
}

const CACHE_KEY = {
  grid: (sessionId: number) => `f1_grid_${sessionId}`,
  positions: (sessionId: number, driverNumber: number) => 
    `f1_positions_${sessionId}_${driverNumber}`
};

export const DriverGrid: React.FC<Props> = ({ 
  sessionId, 
  drivers, 
  isLoading, 
  raceTime,
  sessionStartTime
}) => {
  const [positionData, setPositionData] = useState<{[key: number]: PositionData[]}>({});
  const [gridPositions, setGridPositions] = useState<GridPosition[]>([]);
  const [isLoadingGrid, setIsLoadingGrid] = useState(true);

  // Fetch position data for all drivers
  useEffect(() => {
    const fetchPositionData = async () => {
      if (!sessionId || drivers.length === 0) return;

      try {
        const positionsPromises = drivers.map(async driver => {
          const cacheKey = CACHE_KEY.positions(sessionId, driver.driver_number);
          const cachedData = cacheUtils.get<PositionData[]>(cacheKey);
          
          if (cachedData) return { driver: driver, data: cachedData };

          const data = await apiQueue.enqueue<ApiPositionResponse[]>(
            `/api/position?session_key=${sessionId}&driver_number=${driver.driver_number}`
          );
          const mappedData = data.map(pos => mapApiPositionToPositionData(pos, sessionId));
          cacheUtils.set(cacheKey, mappedData, 24 * 60 * 60 * 1000);
          return { driver: driver, data: mappedData };
        });

        const results = await Promise.all(positionsPromises);
        const newPositionData = results.reduce((acc, { driver, data }) => {
          acc[driver.driver_number] = data;
          return acc;
        }, {} as {[key: number]: PositionData[]});

        setPositionData(newPositionData);
        setIsLoadingGrid(false);
      } catch (error) {
        console.error('Error fetching position data:', error);
        setIsLoadingGrid(false);
      }
    };

    fetchPositionData();
  }, [sessionId, drivers]);

  // Update grid positions based on race time
  useEffect(() => {
    if (!Object.keys(positionData).length) return;

    const currentPositions = drivers.map(driver => {
      const driverPositions = positionData[driver.driver_number] || [];
      const position = findPositionAtTime(driverPositions, raceTime, sessionStartTime) || 0;
      return { position, driver };
    });

    const sortedGrid = currentPositions
      .filter(pos => pos.position > 0)
      .sort((a, b) => a.position - b.position);

    setGridPositions(sortedGrid);
  }, [positionData, drivers, raceTime, sessionStartTime]);

  if (isLoading || isLoadingGrid) {
    return <LoadingSpinner />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {gridPositions.map(({ position, driver }) => (
        <div 
          key={driver.driver_number}
          className="bg-gray-800 rounded-lg p-4 shadow-xl flex items-center gap-4"
        >
          <div className="text-2xl font-bold text-gray-500 w-10">
            P{position}
          </div>
          <div className="flex-1">
            <div className={`${getTeamColor(driver.team_name)} text-lg font-semibold`}>
              {driver.full_name}
            </div>
            <div className="text-sm text-gray-400">
              {driver.team_name} | #{driver.driver_number}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}; 