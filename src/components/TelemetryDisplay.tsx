import React from 'react';
import { CarData } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface Props {
  data: CarData | null;
  isLoading: boolean;
}

export const TelemetryDisplay: React.FC<Props> = ({ data, isLoading }) => {
  if (isLoading) return <LoadingSpinner />;
  if (!data) return null;

  const isDrsActive = data.drs >= 10;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="text-gray-400 text-sm">Speed</div>
        <div className="text-2xl font-bold">{data.speed} km/h</div>
      </div>
      
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="text-gray-400 text-sm">RPM</div>
        <div className="text-2xl font-bold">{data.rpm}</div>
      </div>
      
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="text-gray-400 text-sm">Gear</div>
        <div className="text-2xl font-bold">{data.n_gear === 0 ? 'N' : data.n_gear}</div>
      </div>
      
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="text-gray-400 text-sm">Throttle</div>
        <div className="text-2xl font-bold">{data.throttle}%</div>
      </div>
      
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="text-gray-400 text-sm">Brake</div>
        <div className="text-2xl font-bold">{data.brake > 0 ? 'ACTIVE' : 'OFF'}</div>
      </div>
      
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="text-gray-400 text-sm">DRS</div>
        <div className="text-2xl font-bold">{isDrsActive ? 'ENABLED' : 'DISABLED'}</div>
      </div>
    </div>
  );
}; 