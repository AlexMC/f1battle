import React from 'react';

interface Props {
  speed: number;
  onSpeedChange: (newSpeed: number) => void;
}

export const SimulationControls: React.FC<Props> = ({ speed, onSpeedChange }) => {
  const handleSpeedChange = (increment: boolean) => {
    const newSpeed = increment ? Math.min(speed + 1, 20) : Math.max(speed - 1, 1);
    onSpeedChange(newSpeed);
  };

  return (
    <div className="flex items-center gap-4 mb-4">
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
  );
}; 