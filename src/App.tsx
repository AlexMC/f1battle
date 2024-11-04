import React, { useState } from 'react';
import { DriverSelector } from './components/DriverSelector';
import { SessionSelector } from './components/SessionSelector';
import { useF1Data } from './hooks/useF1Data';
import { Driver, TimingData } from './types';
import { LapComparison } from './components/LapComparison';
import { SessionHeader } from './components/SessionHeader';
import { SimulationControls } from './components/SimulationControls';
import { GapDisplay } from './components/GapDisplay';
import { TeamRadioManager } from './components/TeamRadioManager';

export const App: React.FC = () => {
  const { sessions, selectedSession, setSelectedSession, drivers, timingData, setSelectedDrivers, isLoading } = useF1Data();
  const [selectedDriver1, setSelectedDriver1] = useState<Driver | null>(null);
  const [selectedDriver2, setSelectedDriver2] = useState<Driver | null>(null);
  const [isSelectionCollapsed, setIsSelectionCollapsed] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [isSimulationStarted, setIsSimulationStarted] = useState(false);
  const [currentRaceTime, setCurrentRaceTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

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

  const handleConfirmSelection = () => {
    setIsSelectionCollapsed(true);
    setIsSimulationStarted(true);
    setCurrentRaceTime(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">F1 Live Battle</h1>
        
        {(!isSelectionCollapsed || !selectedDriver1 || !selectedDriver2) && (
          <SessionSelector
            sessions={sessions}
            selectedSession={selectedSession}
            onSelectSession={setSelectedSession}
          />
        )}

        {selectedSession && (
          <>
            {isSelectionCollapsed && selectedDriver1 && selectedDriver2 ? (
              <SessionHeader
                session={selectedSession}
                driver1={selectedDriver1}
                driver2={selectedDriver2}
                onEdit={() => setIsSelectionCollapsed(false)}
              />
            ) : (
              <DriverSelector
                drivers={drivers}
                selectedDriver1={selectedDriver1}
                selectedDriver2={selectedDriver2}
                onSelectDriver1={handleSelectDriver1}
                onSelectDriver2={handleSelectDriver2}
              />
            )}

            {selectedDriver1 && selectedDriver2 && !isSelectionCollapsed && (
              <div className="flex justify-end mb-8">
                <button
                  onClick={handleConfirmSelection}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Start Simulation
                </button>
              </div>
            )}

            {selectedDriver1 && selectedDriver2 && (
              <div className="mt-4">
                {isSimulationStarted && (
                  <>
                    <h2 className="text-xl font-semibold mb-4">Lap by Lap Comparison</h2>
                    {selectedSession?.status !== 'active' && (
                      <SimulationControls 
                        speed={simulationSpeed}
                        onSpeedChange={setSimulationSpeed}
                        raceTime={currentRaceTime}
                        isPaused={isPaused}
                        onPauseChange={setIsPaused}
                        sessionStartDate={selectedSession.date}
                      />
                    )}
                    <GapDisplay
                      sessionId={selectedSession.session_id}
                      driver1={selectedDriver1}
                      driver2={selectedDriver2}
                      raceTime={currentRaceTime}
                      isLiveSession={selectedSession?.status === 'active'}
                    />
                    <TeamRadioManager
                      sessionId={selectedSession.session_id}
                      driver1={selectedDriver1}
                      driver2={selectedDriver2}
                      raceTime={currentRaceTime}
                    />
                    <LapComparison 
                      timingData={timingData}
                      driver1={selectedDriver1}
                      driver2={selectedDriver2}
                      isLiveSession={selectedSession?.status === 'active'}
                      simulationSpeed={simulationSpeed}
                      isLoading={isLoading}
                      isSimulationStarted={isSimulationStarted}
                      onRaceTimeUpdate={setCurrentRaceTime}
                      isPaused={isPaused}
                    />
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}; 