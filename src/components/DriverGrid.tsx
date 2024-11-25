import React, { useState } from 'react';
import { Driver, TeamRadio } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { DriverGridItem } from './DriverGridItem';

interface Props {
  sessionId: number;
  drivers: Driver[];
  isLoading: boolean;
  raceTime: number;
  sessionStartTime: Date;
  onSelectDriver: (driver: Driver, position: number, availableRadioMessages: number) => void;
  selectedDriver: Driver | null;
  radioMessages: {[key: number]: TeamRadio[]};
}

interface GridPosition {
  position: number;
  driver: Driver;
  availableRadioMessages: number;
}

interface SelectedDriverData {
  driver: Driver;
  position: number;
  availableRadioMessages: number;
}

const CACHE_KEY = {
  grid: (sessionId: number) => `f1_grid_${sessionId}`,
  positions: (sessionId: number, driverNumber: number) => 
    `f1_positions_${sessionId}_${driverNumber}`
};

export const DriverGrid: React.FC<Props> = ({ 
  sessionId, 
  drivers, 
  isLoading: parentIsLoading, 
  raceTime,
  sessionStartTime,
  onSelectDriver,
  selectedDriver,
  radioMessages
}) => {
  const [positions, setPositions] = useState<{[key: number]: number}>({});

  const handlePositionUpdate = (driverNumber: number, position: number) => {
    setPositions(prev => ({
      ...prev,
      [driverNumber]: position
    }));
  };

  const sortedDrivers = [...drivers].sort((a, b) => {
    const posA = positions[a.driver_number] || 0;
    const posB = positions[b.driver_number] || 0;
    if (posA === 0) return 1;
    if (posB === 0) return -1;
    return posA - posB;
  });

  if (parentIsLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sortedDrivers.map(driver => (
        <DriverGridItem
          key={driver.driver_number}
          sessionId={sessionId}
          driver={driver}
          raceTime={raceTime}
          sessionStartTime={sessionStartTime}
          radioMessages={radioMessages}
          onSelectDriver={onSelectDriver}
          isSelected={selectedDriver?.driver_number === driver.driver_number}
          onPositionUpdate={handlePositionUpdate}
        />
      ))}
    </div>
  );
}; 