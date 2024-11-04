import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session } from '../types';

interface TimeState {
  sessionStartTime: Date | null;
  currentTime: Date;
  raceTime: number;
  simulationSpeed: number;
  isPaused: boolean;
  isSimulationStarted: boolean;
}

interface TimeContextType extends TimeState {
  initialTimestamp: number;
  setSimulationSpeed: (speed: number) => void;
  setIsPaused: (paused: boolean) => void;
  setIsSimulationStarted: (started: boolean) => void;
  resetSimulation: () => void;
}

const TimeContext = createContext<TimeContextType | null>(null);

interface TimeProviderProps {
  children: React.ReactNode;
  session: Session;
  initialTimestamp: number;
  isLiveSession: boolean;
}

export const TimeProvider: React.FC<TimeProviderProps> = ({
  children,
  session,
  initialTimestamp,
  isLiveSession
}) => {
  const [timeState, setTimeState] = useState<TimeState>({
    sessionStartTime: new Date(initialTimestamp),
    currentTime: new Date(initialTimestamp),
    raceTime: 0,
    simulationSpeed: 1,
    isPaused: true,
    isSimulationStarted: false
  });

  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!timeState.sessionStartTime || timeState.isPaused || !timeState.isSimulationStarted) return;

    const updateInterval = setInterval(() => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateRef.current) / 1000;
      const simulatedDelta = deltaTime * timeState.simulationSpeed;

      setTimeState(prev => {
        if (isLiveSession) {
          const currentRaceTime = (Date.now() - prev.sessionStartTime!.getTime()) / 1000;
          return {
            ...prev,
            raceTime: currentRaceTime,
            currentTime: new Date()
          };
        } else {
          const newRaceTime = prev.raceTime + simulatedDelta;
          return {
            ...prev,
            raceTime: newRaceTime,
            currentTime: new Date(prev.sessionStartTime!.getTime() + (newRaceTime * 1000))
          };
        }
      });

      lastUpdateRef.current = now;
    }, 100);

    return () => clearInterval(updateInterval);
  }, [timeState.sessionStartTime, timeState.isPaused, timeState.isSimulationStarted, isLiveSession]);

  const contextValue: TimeContextType = {
    ...timeState,
    initialTimestamp,
    setSimulationSpeed: (speed) => setTimeState(prev => ({ ...prev, simulationSpeed: speed })),
    setIsPaused: (paused) => setTimeState(prev => ({ ...prev, isPaused: paused })),
    setIsSimulationStarted: (started) => setTimeState(prev => ({ ...prev, isSimulationStarted: started })),
    resetSimulation: () => {
      setTimeState(prev => ({
        ...prev,
        currentTime: prev.sessionStartTime!,
        raceTime: 0,
        isPaused: true,
        isSimulationStarted: false
      }));
      lastUpdateRef.current = Date.now();
    }
  };

  return (
    <TimeContext.Provider value={contextValue}>
      {children}
    </TimeContext.Provider>
  );
};

export const useTime = () => {
  const context = useContext(TimeContext);
  if (!context) {
    throw new Error('useTime must be used within a TimeProvider');
  }
  return context;
}; 