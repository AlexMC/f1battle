import React from 'react';

interface Props {
  speed: number;
  onSpeedChange: (newSpeed: number) => void;
  raceTime: number;
  isPaused: boolean;
  onPauseChange: (paused: boolean) => void;
  localTime: Date;
}

const formatRaceTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const SimulationControls: React.FC<Props> = ({ 
  speed, 
  onSpeedChange, 
  raceTime,
  isPaused,
  onPauseChange,
  localTime
}) => {
  const handleSpeedChange = (increment: boolean) => {
    const newSpeed = increment ? Math.min(speed + 1, 20) : Math.max(speed - 1, 1);
    onSpeedChange(newSpeed);
  };

  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center space-x-4">
        <span className="text-gray-300">Simulation Speed:</span>
        <button 
          onClick={() => handleSpeedChange(false)}
          className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
          disabled={speed <= 1}
        >
          -
        </button>
        <div className="w-16 text-center">
          {speed}x
        </div>
        <button 
          onClick={() => handleSpeedChange(true)}
          className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
          disabled={speed >= 20}
        >
          +
        </button>
        <button
          onClick={() => onPauseChange(!isPaused)}
          className={`px-4 py-1 rounded transition-colors ${
            isPaused 
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>
      <div className="flex flex-col items-end">
        <div className="text-gray-300 font-mono text-lg">
          Race Time: {formatRaceTime(raceTime)}
        </div>
        <div className="text-gray-400 font-mono text-sm">
          Local Time: {localTime.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}; 