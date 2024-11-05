import { useState, useEffect, useRef } from 'react';
import { Session } from '../types';

interface TimelineState {
  raceTime: number;        // Seconds since session start
  localTime: Date;         // Current local time
  sessionStartTime: Date;  // Session start time from API
  isPaused: boolean;
  speed: number;
}

interface Props {
  session: Session | null;
  isLiveSession: boolean;
  sessionStartTime: Date | null;
  raceEndTime: number;
}

export const useTimelineManager = ({
  session,
  isLiveSession,
  sessionStartTime,
  raceEndTime
}: Props) => {
  const [state, setState] = useState<TimelineState>(() => ({
    raceTime: 0,
    localTime: new Date(),
    sessionStartTime: sessionStartTime || new Date(),
    isPaused: true,
    speed: 1
  }));

  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!session || !sessionStartTime) return;
    
    // Reset timeline when session or start time changes
    setState(prev => ({
      ...prev,
      raceTime: 0,
      sessionStartTime: sessionStartTime,
      isPaused: true
    }));
  }, [session, sessionStartTime]);

  useEffect(() => {
    if (state.isPaused || !session) return;

    const intervalId = setInterval(() => {
      const now = Date.now();
      const realTimeDelta = (now - lastUpdateRef.current) / 1000;
      const simulatedDelta = realTimeDelta * state.speed;

      setState(prev => {
        const newRaceTime = Math.min(prev.raceTime + simulatedDelta, raceEndTime);
        const newLocalTime = new Date(
          prev.sessionStartTime.getTime() + (newRaceTime * 1000)
        );

        // Auto-pause when reaching the end
        if (newRaceTime >= raceEndTime && !prev.isPaused) {
          setPaused(true);
        }

        return {
          ...prev,
          raceTime: newRaceTime,
          localTime: newLocalTime
        };
      });

      lastUpdateRef.current = now;
    }, 100);

    return () => clearInterval(intervalId);
  }, [state.isPaused, state.speed, session, raceEndTime]);

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