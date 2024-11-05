import React from 'react';
import { SessionSelector } from './SessionSelector';
import { DriverGrid } from './DriverGrid';
import { SimulationControls } from './SimulationControls';
import { useF1Data } from '../hooks/useF1Data';
import { useTimelineManager } from '../hooks/useTimelineManager';

export const RaceTime: React.FC = () => {
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

        {selectedSession && (
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

            <DriverGrid 
              sessionId={selectedSession.session_id}
              drivers={drivers}
              isLoading={isLoading}
              raceTime={timeline.raceTime}
            />
          </>
        )}
      </div>
    </div>
  );
}; 