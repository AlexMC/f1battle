import React, { useState } from 'react';
import { CarData } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { Gauge } from './Gauge';

interface Props {
  data: CarData | null;
  isLoading: boolean;
}

export const TelemetryDisplay: React.FC<Props> = ({ data, isLoading }) => {
  const [showGraphical, setShowGraphical] = useState(true);
  
  if (isLoading) return <LoadingSpinner />;
  if (!data) return null;

  const isDrsActive = data.drs >= 10;

  const renderNumericDisplay = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
        <div className="text-2xl font-bold">{data.gear === 0 ? 'N' : data.gear}</div>
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

  const renderGraphicalDisplay = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <Gauge
          value={data.speed}
          min={0}
          max={360}
          label="Speed"
          unit="km/h"
        />
        <Gauge
          value={data.rpm}
          min={0}
          max={15000}
          label="RPM"
          redline={12000}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Gear</div>
          <div className="text-2xl font-bold">{data.gear === 0 ? 'N' : data.gear}</div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-2">Throttle</div>
          <div className="h-8 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-200"
              style={{ width: `${data.throttle}%` }}
            />
          </div>
          <div className="text-right text-sm text-gray-400 mt-1">
            {data.throttle}%
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-2">Brake</div>
          <div className="flex justify-center">
            <div 
              className={`w-12 h-12 rounded-full border-4 ${
                data.brake > 0 
                  ? 'bg-red-500 border-red-600' 
                  : 'bg-gray-800 border-gray-600'
              } transition-colors duration-200`}
            />
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="text-gray-400 text-sm">DRS</div>
          <div className="text-2xl font-bold">{isDrsActive ? 'ENABLED' : 'DISABLED'}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mt-6">
      <div className="flex justify-end mb-4">
        <label className="inline-flex items-center cursor-pointer">
          <span className="mr-3 text-sm font-medium text-gray-300">
            {showGraphical ? 'Graphical' : 'Numeric'}
          </span>
          <div className="relative">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={showGraphical}
              onChange={() => setShowGraphical(!showGraphical)}
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600" />
          </div>
        </label>
      </div>
      {showGraphical ? renderGraphicalDisplay() : renderNumericDisplay()}
    </div>
  );
}; 