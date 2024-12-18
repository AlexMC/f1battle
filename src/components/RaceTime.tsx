import React, { useState, useEffect } from 'react';
import { SessionSelector } from './SessionSelector';
import { DriverGrid } from './DriverGrid';
import { SimulationControls } from './SimulationControls';
import { useF1Data } from '../hooks/useF1Data';
import { useTimelineManager } from '../hooks/useTimelineManager';
import { DriverDetail } from './DriverDetail';
import { Driver } from '../types';
import { useTeamRadios } from '../hooks/useTeamRadios';

interface SelectedDriverData {
  driver: Driver;
  position: number;
  availableRadioMessages: number;
}

export const RaceTime: React.FC = () => {
  const [isSimulationStarted, setIsSimulationStarted] = useState(false);
  const [selectedDriverData, setSelectedDriverData] = useState<SelectedDriverData | null>(null);
  const { 
    sessions, 
    selectedSession, 
    setSelectedSession,
    drivers,
    isLoading,
    sessionStartTime,
    raceEndTime
  } = useF1Data();

  const isLiveSession = selectedSession?.status === 'active';
  const timeline = useTimelineManager({
    session: selectedSession,
    isLiveSession,
    sessionStartTime,
    raceEndTime
  });

  const { radioMessages, isLoading: isLoadingRadios } = useTeamRadios(
    selectedSession?.session_id || 0,
    drivers,  // Pass all drivers to get all radio messages at once
    timeline.raceTime,
    timeline.sessionStartTime
  );

  const handleStartSimulation = () => {
    setIsSimulationStarted(true);
    timeline.setPaused(false);
  };

  const handleSelectDriver = (
    driver: Driver, 
    position: number, 
    availableRadioMessages: number
  ) => {
    setSelectedDriverData({ driver, position, availableRadioMessages });
  };

  const handleBackToGrid = () => {
    setSelectedDriverData(null);
  };

  useEffect(() => {
    // Reset simulation state when session changes
    setIsSimulationStarted(false);
    setSelectedDriverData(null);
  }, [selectedSession]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <h1 className="text-4xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500">
          F1 Race Time
        </h1>
        
        <SessionSelector
          sessions={sessions}
          selectedSession={selectedSession}
          onSelectSession={setSelectedSession}
        />

        {selectedSession && !isSimulationStarted && (
          <div className="flex justify-end mb-8">
            <button
              onClick={handleStartSimulation}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Start Simulation
            </button>
          </div>
        )}

        {selectedSession && isSimulationStarted && (
          <>
            <div className="mt-8 mb-8">
              <SimulationControls 
                speed={timeline.speed}
                onSpeedChange={timeline.setSpeed}
                raceTime={timeline.raceTime}
                isPaused={timeline.isPaused}
                onPauseChange={timeline.setPaused}
                localTime={timeline.localTime}
              />
            </div>

            {selectedDriverData ? (
              <DriverDetail 
                sessionId={selectedSession.session_id}
                driver={selectedDriverData.driver}
                availableRadioMessages={selectedDriverData.availableRadioMessages}
                onBack={handleBackToGrid}
                raceTime={timeline.raceTime}
                sessionStartTime={timeline.sessionStartTime}
                circuitKey={selectedSession?.circuit_short_name?.toLowerCase() || 'bahrain'}
              />
            ) : (
              <DriverGrid 
                sessionId={selectedSession.session_id}
                drivers={drivers}
                isLoading={isLoading || isLoadingRadios}
                raceTime={timeline.raceTime}
                sessionStartTime={timeline.sessionStartTime}
                onSelectDriver={handleSelectDriver}
                selectedDriver={null}
                radioMessages={radioMessages}  // Pass down radio messages
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}; 