import { useState, useEffect, useRef } from 'react';
import { Session } from '../types';

interface TimelineState {
  raceTime: number;        // Seconds since session start
  localTime: Date;         // Current local time
  sessionStartTime: Date;  // Session start time from API
  isPaused: boolean;
  speed: number;
}

export const useTimelineManager = (
  session: Session | null,
  isLiveSession: boolean
) => {
  const [state, setState] = useState<TimelineState>(() => ({
    raceTime: 0,
    localTime: new Date(),
    sessionStartTime: session ? new Date(session.date) : new Date(),
    isPaused: true,
    speed: 1
  }));

  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!session) return;
    
    // Reset timeline when session changes
    setState(prev => ({
      ...prev,
      raceTime: 0,
      sessionStartTime: new Date(session.date),
      isPaused: true
    }));
  }, [session]);

  useEffect(() => {
    if (state.isPaused || !session) return;

    const intervalId = setInterval(() => {
      const now = Date.now();
      const realTimeDelta = (now - lastUpdateRef.current) / 1000;
      const simulatedDelta = realTimeDelta * state.speed;

      setState(prev => {
        const newRaceTime = prev.raceTime + simulatedDelta;
        const newLocalTime = new Date(
          prev.sessionStartTime.getTime() + (newRaceTime * 1000)
        );

        return {
          ...prev,
          raceTime: newRaceTime,
          localTime: newLocalTime
        };
      });

      lastUpdateRef.current = now;
    }, 100);

    return () => clearInterval(intervalId);
  }, [state.isPaused, state.speed, session]);

  const setSpeed = (newSpeed: number) => {
    setState(prev => ({ ...prev, speed: newSpeed }));
  };

  const setPaused = (paused: boolean) => {
    if (!paused) {
      lastUpdateRef.current = Date.now();
    }
    setState(prev => ({ ...prev, isPaused: paused }));
  };

  const seekTo = (newRaceTime: number) => {
    setState(prev => {
      const newLocalTime = new Date(
        prev.sessionStartTime.getTime() + (newRaceTime * 1000)
      );
      return {
        ...prev,
        raceTime: newRaceTime,
        localTime: newLocalTime
      };
    });
  };

  return {
    ...state,
    setSpeed,
    setPaused,
    seekTo
  };
}; 