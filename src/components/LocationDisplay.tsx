import React from 'react';
import { LocationData } from '../types';

interface Props {
  location: LocationData | null;
  isLoading: boolean;
}

export const LocationDisplay: React.FC<Props> = ({ location, isLoading }) => {
  if (isLoading) return <div>Loading location...</div>;
  if (!location) return null;

  return (
    <div className="grid grid-cols-3 gap-2 text-sm bg-gray-800 p-2 rounded">
      <div>
        <span className="text-gray-400">X:</span> {location.x.toFixed(0)}
      </div>
      <div>
        <span className="text-gray-400">Y:</span> {location.y.toFixed(0)}
      </div>
      <div>
        <span className="text-gray-400">Z:</span> {location.z.toFixed(0)}
      </div>
    </div>
  );
}; 