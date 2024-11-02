import React from 'react';
import { Driver } from '../types';

interface Props {
  drivers: Driver[];
  selectedDriver1: Driver | null;
  selectedDriver2: Driver | null;
  onSelectDriver1: (driver: Driver) => void;
  onSelectDriver2: (driver: Driver) => void;
}

export const DriverSelector: React.FC<Props> = ({
  drivers,
  selectedDriver1,
  selectedDriver2,
  onSelectDriver1,
  onSelectDriver2,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-6 p-6 bg-gray-800 rounded-lg shadow-xl mb-8">
      <div className="flex-1">
        <label className="block text-lg font-medium mb-3 text-gray-200">Driver 1</label>
        <select
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
          value={selectedDriver1?.driver_number || ''}
          onChange={(e) => {
            const driver = drivers.find(d => d.driver_number.toString() === e.target.value);
            if (driver) onSelectDriver1(driver);
          }}
        >
          <option value="">Select Driver</option>
          {drivers.map((driver) => (
            <option key={driver.driver_number} value={driver.driver_number}>
              {driver.full_name} ({driver.team_name})
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="block text-lg font-medium mb-3 text-gray-200">Driver 2</label>
        <select
          className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
          value={selectedDriver2?.driver_number || ''}
          onChange={(e) => {
            const driver = drivers.find(d => d.driver_number.toString() === e.target.value);
            if (driver) onSelectDriver2(driver);
          }}
        >
          <option value="">Select Driver</option>
          {drivers.map((driver) => (
            <option key={driver.driver_number} value={driver.driver_number}>
              {driver.full_name} ({driver.team_name})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}; 