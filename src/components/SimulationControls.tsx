import React from 'react';

interface Props {
  speed: number;
  onSpeedChange: (newSpeed: number) => void;
  raceTime: number;
}

const formatRaceTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const SimulationControls: React.FC<Props> = ({ speed, onSpeedChange, raceTime }) => {
  const handleSpeedChange = (increment: boolean) => {
    const newSpeed = increment ? Math.min(speed + 1, 20) : Math.max(speed - 1, 1);
    onSpeedChange(newSpeed);
  };

  return (
    <div className="flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-4">
        <span className="text-gray-300">Simulation Speed: {speed}x</span>
        <div className="flex gap-2">
          <button
            onClick={() => handleSpeedChange(false)}
            disabled={speed <= 1}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            -
          </button>
          <button
            onClick={() => handleSpeedChange(true)}
            disabled={speed >= 20}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            +
          </button>
        </div>
      </div>
      <div className="text-gray-300 font-mono text-lg">
        Race Time: {formatRaceTime(raceTime)}
      </div>
    </div>
  );
}; 