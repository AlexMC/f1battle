import React, { useState } from 'react';
import { DriverSelector } from './DriverSelector';
import { SessionSelector } from './SessionSelector';
import { useF1Data } from '../hooks/useF1Data';
import { Driver } from '../types';
import { LapComparison } from './LapComparison';
import { SessionHeader } from './SessionHeader';
import { SimulationControls } from './SimulationControls';
import { GapDisplay } from './GapDisplay';
import { TeamRadioManager } from './TeamRadioManager';
import { useTimelineManager } from '../hooks/useTimelineManager';

export const LiveBattle: React.FC = () => {
  const { 
    sessions, 
    selectedSession, 
    setSelectedSession, 
    drivers, 
    timingData, 
    setSelectedDrivers, 
    isLoading,
    sessionStartTime,
    raceEndTime 
  } = useF1Data();

  const [selectedDriver1, setSelectedDriver1] = useState<Driver | null>(null);
  const [selectedDriver2, setSelectedDriver2] = useState<Driver | null>(null);
  const [isSelectionCollapsed, setIsSelectionCollapsed] = useState(false);

  const isLiveSession = selectedSession?.status === 'active';
  const timeline = useTimelineManager({
    session: selectedSession,
    isLiveSession,
    sessionStartTime,
    raceEndTime
  });

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
    timeline.setPaused(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">
          F1 Live Battle
        </h1>
        
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

            {selectedDriver1 && selectedDriver2 && (
              <div className="mt-4">
                {!isSelectionCollapsed && (
                  <div className="flex justify-end mb-8">
                    <button
                      onClick={handleConfirmSelection}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Start Simulation
                    </button>
                  </div>
                )}

                {isSelectionCollapsed && (
                  <>
                    <h2 className="text-xl font-semibold mb-4">Lap by Lap Comparison</h2>
                    <SimulationControls 
                      speed={timeline.speed}
                      onSpeedChange={timeline.setSpeed}
                      raceTime={timeline.raceTime}
                      isPaused={timeline.isPaused}
                      onPauseChange={timeline.setPaused}
                      localTime={timeline.localTime}
                    />
                    <GapDisplay
                      sessionId={selectedSession.session_id}
                      driver1={selectedDriver1}
                      driver2={selectedDriver2}
                      raceTime={timeline.raceTime}
                      isLiveSession={isLiveSession}
                      localTime={timeline.localTime}
                      sessionStartTime={timeline.sessionStartTime}
                    />
                    <TeamRadioManager
                      sessionId={selectedSession.session_id}
                      driver1={selectedDriver1}
                      driver2={selectedDriver2}
                      raceTime={timeline.raceTime}
                      localTime={timeline.localTime}
                      sessionStartTime={timeline.sessionStartTime}
                    />
                    <LapComparison 
                      timingData={timingData}
                      driver1={selectedDriver1}
                      driver2={selectedDriver2}
                      isLiveSession={isLiveSession}
                      isLoading={isLoading}
                      raceTime={timeline.raceTime}
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