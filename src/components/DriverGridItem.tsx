import React, { useEffect } from 'react';
import { Driver } from '../types';
import { useDriverPosition } from '../hooks/useDriverPosition';
import { getTeamColor } from '../utils/colors';
import { RadioMessageIndicator } from './RadioMessageIndicator';

interface Props {
  sessionId: number;
  driver: Driver;
  raceTime: number;
  sessionStartTime: Date;
  radioMessages: Record<number, any[]>;
  onSelectDriver: (driver: Driver, position: number, availableRadioMessages: number) => void;
  isSelected: boolean;
  onPositionUpdate: (driverNumber: number, position: number) => void;
}

export const DriverGridItem: React.FC<Props> = ({
  sessionId,
  driver,
  raceTime,
  sessionStartTime,
  radioMessages,
  onSelectDriver,
  isSelected,
  onPositionUpdate
}) => {
  const { currentPosition, isLoading } = useDriverPosition({
    sessionId,
    driver,
    raceTime,
    sessionStartTime
  });

  useEffect(() => {
    if (currentPosition > 0) {
      onPositionUpdate(driver.driver_number, currentPosition);
    }
  }, [currentPosition]);

  const driverRadios = radioMessages[driver.driver_number] || [];
  const availableMessages = driverRadios.filter(radio => {
    const messageTime = (new Date(radio.date).getTime() - sessionStartTime.getTime()) / 1000;
    return messageTime <= raceTime;
  }).length;

  if (isLoading || currentPosition === 0) return null;

  return (
    <div 
      className={`bg-gray-800 rounded-lg p-4 shadow-xl flex items-center gap-4 cursor-pointer hover:bg-gray-750 transition-colors ${
        isSelected ? 'ring-2 ring-red-500' : ''
      }`}
      onClick={() => onSelectDriver(driver, currentPosition, availableMessages)}
    >
      <div className="text-2xl font-bold text-gray-500 w-10">
        P{currentPosition}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className={`${getTeamColor(driver.team_name)} text-lg font-semibold`}>
            {driver.full_name}
          </span>
          <RadioMessageIndicator messageCount={availableMessages} />
        </div>
        <div className="text-sm text-gray-400">
          {driver.team_name} | #{driver.driver_number}
        </div>
      </div>
    </div>
  );
};
