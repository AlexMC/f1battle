import React, { useState } from 'react';
import { DriverSelector } from './components/DriverSelector';
import { SessionSelector } from './components/SessionSelector';
import { useF1Data } from './hooks/useF1Data';
import { Driver, TimingData } from './types';
import { LapComparison } from './components/LapComparison';

export const App: React.FC = () => {
  const { sessions, selectedSession, setSelectedSession, drivers, timingData, setSelectedDrivers } = useF1Data();
  const [selectedDriver1, setSelectedDriver1] = useState<Driver | null>(null);
  const [selectedDriver2, setSelectedDriver2] = useState<Driver | null>(null);

  const getLatestDriverTiming = (driverNumber: number) => {
    return timingData
      .filter(t => t.driver_number === driverNumber)
      .sort((a, b) => b.lap_number - a.lap_number)[0];
  };

  const calculateGap = () => {
    if (!selectedDriver1 || !selectedDriver2) return null;
    
    const timing1 = getLatestDriverTiming(selectedDriver1.driver_number);
    const timing2 = getLatestDriverTiming(selectedDriver2.driver_number);
    
    if (!timing1 || !timing2) return null;
    
    return Math.abs((timing1.gap_to_leader || 0) - (timing2.gap_to_leader || 0));
  };

  const handleSelectDriver1 = (driver: Driver) => {
    setSelectedDriver1(driver);
    setSelectedDrivers(prev => ({ ...prev, driver1: driver.driver_number }));
  };

  const handleSelectDriver2 = (driver: Driver) => {
    setSelectedDriver2(driver);
    setSelectedDrivers(prev => ({ ...prev, driver2: driver.driver_number }));
  };

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold my-4">F1 Live Battle</h1>
      
      <SessionSelector
        sessions={sessions}
        selectedSession={selectedSession}
        onSelectSession={setSelectedSession}
      />
      
      {selectedSession && (
        <>

          <DriverSelector
            drivers={drivers}
            selectedDriver1={selectedDriver1}
            selectedDriver2={selectedDriver2}
            onSelectDriver1={handleSelectDriver1}
            onSelectDriver2={handleSelectDriver2}
          />

          {selectedDriver1 && selectedDriver2 && (
            <div className="mt-4">
              <h2 className="text-xl font-semibold mb-4">Lap by Lap Comparison</h2>
              <LapComparison 
                timingData={timingData}
                driver1={selectedDriver1}
                driver2={selectedDriver2}
                isLiveSession={selectedSession?.status === 'active'}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}; 