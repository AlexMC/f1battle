import React, { useState, useEffect } from 'react';
import { Driver, PositionData } from '../types';
import { getTeamColor } from '../utils/colors';
import { LoadingSpinner } from './LoadingSpinner';
import { cacheUtils } from '../utils/cache';

interface Props {
  sessionId: number;
  drivers: Driver[];
  isLoading: boolean;
  raceTime: number;
}

interface GridPosition {
  position: number;
  driver: Driver;
}

const CACHE_KEY = (sessionId: number) => `f1_grid_${sessionId}`;

export const DriverGrid: React.FC<Props> = ({ sessionId, drivers, isLoading, raceTime }) => {
  const [gridPositions, setGridPositions] = useState<GridPosition[]>([]);
  const [isLoadingGrid, setIsLoadingGrid] = useState(true);

  useEffect(() => {
    const fetchStartingGrid = async () => {
      if (!sessionId || drivers.length === 0) return;

      // Try to get from cache first
      const cachedGrid = cacheUtils.get<GridPosition[]>(CACHE_KEY(sessionId));
      if (cachedGrid) {
        setGridPositions(cachedGrid);
        setIsLoadingGrid(false);
        return;
      }

      try {
        // Fetch initial positions for all drivers
        const positionPromises = drivers.map(driver =>
          fetch(`/api/position?session_key=${sessionId}&driver_number=${driver.driver_number}`)
            .then(res => res.json())
            .then((data: PositionData[]) => {
              // Sort by date to get the earliest position
              const sortedData = data.sort((a, b) => 
                new Date(a.date).getTime() - new Date(b.date).getTime()
              );
              return {
                driver,
                position: sortedData[0]?.position || 0
              };
            })
        );

        const positions = await Promise.all(positionPromises);
        const sortedGrid = positions
          .filter(pos => pos.position > 0)
          .sort((a, b) => a.position - b.position)
          .map(pos => ({
            position: pos.position,
            driver: pos.driver
          }));

        // Cache the results
        cacheUtils.set(CACHE_KEY(sessionId), sortedGrid, 24 * 60 * 60 * 1000);
        setGridPositions(sortedGrid);
      } catch (error) {
        console.error('Error fetching starting grid:', error);
      } finally {
        setIsLoadingGrid(false);
      }
    };

    fetchStartingGrid();
  }, [sessionId, drivers]);

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