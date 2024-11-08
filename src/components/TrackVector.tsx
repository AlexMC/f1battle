import React, { useEffect } from 'react';
import { TRACK_PATHS } from '../constants/trackPaths';

interface Props {
  circuitKey?: string;
  className?: string;
}

export const TrackVector: React.FC<Props> = ({ circuitKey = 'bahrain', className = '' }) => {
  useEffect(() => {
    console.log('TrackVector received circuitKey:', circuitKey);
    console.log('Available track paths:', Object.keys(TRACK_PATHS));
    console.log('Normalized circuit key:', String(circuitKey).toLowerCase());
  }, [circuitKey]);
  
  const path = TRACK_PATHS[String(circuitKey).toLowerCase()] || TRACK_PATHS['bahrain'];

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          d={path}
          className="fill-none stroke-gray-600 stroke-2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}; 