import React from 'react';
import { Driver } from '../types';
import { getTeamColor } from '../utils/colors';
import { RadioMessageIndicator } from './RadioMessageIndicator';
import { useDriverPosition } from '../hooks/useDriverPosition';
import { useCarData } from '../hooks/useCarData';
import { LoadingSpinner } from './LoadingSpinner';
import { TelemetryDisplay } from './TelemetryDisplay';

interface Props {
  sessionId: number;
  driver: Driver;
  availableRadioMessages: number;
  onBack: () => void;
  raceTime: number;
  sessionStartTime: Date;
}

export const DriverDetail: React.FC<Props> = ({ 
  sessionId,
  driver, 
  availableRadioMessages,
  onBack,
  raceTime,
  sessionStartTime
}) => {
  const { currentPosition, isLoading: isLoadingPosition } = useDriverPosition({
    sessionId,
    driver,
    raceTime,
    sessionStartTime
  });

  const { currentData: carData, isLoading: isLoadingCarData } = useCarData(
    sessionId,
    driver.driver_number,
    raceTime,
    sessionStartTime
  );

  if (isLoadingPosition) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className="w-5 h-5"
          >
            <path fillRule="evenodd" d="M7.28 7.72a.75.75 0 010 1.06l-2.47 2.47H21a.75.75 0 010 1.5H4.81l2.47 2.47a.75.75 0 11-1.06 1.06l-3.75-3.75a.75.75 0 010-1.06l3.75-3.75a.75.75 0 011.06 0z" clipRule="evenodd" />
          </svg>
          Back to Grid
        </button>
        <RadioMessageIndicator messageCount={availableRadioMessages} />
      </div>

      <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-3xl font-bold text-gray-500">
            P{currentPosition}
          </div>
          <div className="flex-1">
            <h1 className={`${getTeamColor(driver.team_name)} text-2xl font-bold`}>
              {driver.full_name}
            </h1>
            <div className="text-lg text-gray-400">
              {driver.team_name} | #{driver.driver_number}
            </div>
          </div>
        </div>

        <TelemetryDisplay 
          data={carData} 
          isLoading={isLoadingCarData} 
        />
      </div>
    </div>
  );
}; 