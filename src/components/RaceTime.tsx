import React from 'react';
import { SessionSelector } from './SessionSelector';
import { DriverGrid } from './DriverGrid';
import { useF1Data } from '../hooks/useF1Data';

export const RaceTime: React.FC = () => {
  const { 
    sessions, 
    selectedSession, 
    setSelectedSession,
    drivers,
    isLoading
  } = useF1Data();

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
          <DriverGrid 
            sessionId={selectedSession.session_id}
            drivers={drivers}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}; 