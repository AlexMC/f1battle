import { useState, useEffect, useMemo } from 'react';
import { Driver, TimingData, Session, LocationData } from '../types';
import { calculateSessionStartTime } from '../utils/raceTimings';
import { calculateRaceEndTime } from '../utils/raceTimings';
import { apiQueue } from '../utils/apiQueue';
import { ApiDriverResponse } from '../types/api';
import { redisCacheUtils } from '../utils/redisCache';
import { calculateTrackScalingFactors } from '../utils/trackScaling';

const CACHE_KEYS = {
  SESSIONS_2024: 'f1_sessions_2024',
  DRIVERS: (sessionId: number) => `f1_drivers_${sessionId}`,
  DRIVER_TIMING: (sessionId: number, driverNumber: number) => 
    `f1_timing_${sessionId}_${driverNumber}`,
  DRIVER_INTERVALS: (sessionId: number, driverNumber: number) =>
    `f1_intervals_${sessionId}_${driverNumber}`
};

const mapApiSessionToSession = (apiSession: any): Session | null => {
  if (!apiSession || typeof apiSession !== 'object') return null;

  let status = 'unknown';
  const now = new Date();
  const startDate = new Date(apiSession.date_start);
  const endDate = new Date(apiSession.date_end);

  if (now > endDate) {
    status = 'completed';
  } else if (now >= startDate && now <= endDate) {
    status = 'active';
  } else {
    status = 'scheduled';
  }

  return {
    session_id: apiSession.session_key,
    session_name: apiSession.session_name,
    session_type: apiSession.session_type,
    status,
    date: apiSession.date_start,
    year: apiSession.year,
    circuit_key: apiSession.circuit_key,
    circuit_short_name: apiSession.circuit_short_name
  };
};

const mapLapDataToTimingData = (t: any, sessionId: number) => ({
  driver_number: t.driver_number,
  lap_number: t.lap_number,
  sector_1_time: t.duration_sector_1,
  sector_2_time: t.duration_sector_2,
  sector_3_time: t.duration_sector_3,
  lap_time: t.lap_duration,
  gap_to_leader: t.gap_to_leader,
  session_id: sessionId,
  timestamp: t.date_start ? new Date(t.date_start).getTime() : 0
});

export const useF1Data = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, _setSelectedSession] = useState<Session | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [timingData, setTimingData] = useState<TimingData[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<{ driver1: number | null; driver2: number | null }>({ driver1: null, driver2: null });
  const [has2024Data, setHas2024Data] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [trackScalingInitialized, setTrackScalingInitialized] = useState<{[key: number]: boolean}>({});

  // Separate effect for fetching 2024 sessions (one-time)
  useEffect(() => {
    let isMounted = true;

    const fetch2024Sessions = async () => {
      if (has2024Data) return;
      
      try {
        // Try database first
        const dbResponse = await fetch('/db/sessions');
        if (dbResponse.ok) {
          const dbSessions = await dbResponse.json();
          if (dbSessions.length > 0) {
            setSessions(prev => {
              const uniqueSessions = [...prev, ...dbSessions]
                .filter((session, index, self) => 
                  index === self.findIndex((s) => s.session_id === session.session_id)
                )
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              return uniqueSessions;
            });
            setHas2024Data(true);
            return;
          }
        }

        // Fallback to API if database is empty or fails
        const cachedSessions = await redisCacheUtils.get<Session[]>(CACHE_KEYS.SESSIONS_2024);
        if (cachedSessions) {
          setSessions(prev => {
            const uniqueSessions = [...prev, ...cachedSessions]
              .filter((session, index, self) => 
                index === self.findIndex((s) => s.session_id === session.session_id)
              )
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return uniqueSessions;
          });
          setHas2024Data(true);
          return;
        }

        const data = await apiQueue.enqueue<any[]>('/api/sessions?year=2024');

        if (!isMounted) return;

        const data2024Array = Array.isArray(data) ? data : [];
        const mapped2024Sessions = data2024Array
          .map(mapApiSessionToSession)
          .filter((session): session is Session => session !== null);

        // Cache the results
        await redisCacheUtils.set(CACHE_KEYS.SESSIONS_2024, mapped2024Sessions);

        setSessions(prev => {
          const uniqueSessions = [...prev, ...mapped2024Sessions]
            .filter((session, index, self) => 
              index === self.findIndex((s) => s.session_id === session.session_id)
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          return uniqueSessions;
        });
        
        setHas2024Data(true);
      } catch (error) {
        console.error('Error fetching 2024 sessions:', error);
      }
    };

    fetch2024Sessions();
    
    return () => {
      isMounted = false;
    };
  }, [has2024Data]);

  // Separate effect for fetching active sessions (periodic)
  useEffect(() => {
    let isMounted = true;
    let hasActiveSession = false;

    const fetchActiveSessions = async () => {
      try {
        const activeResponse = await fetch('/api/sessions?active=1');
        const activeSessions = await activeResponse.json();

        if (!isMounted) return;

        const activeArray = Array.isArray(activeSessions) ? activeSessions : [];
        hasActiveSession = activeArray.length > 0;

        if (!hasActiveSession) {
          // If no active sessions, clear the interval and return
          return;
        }

        const mappedActiveSessions = activeArray
          .map(mapApiSessionToSession)
          .filter((session): session is Session => session !== null);

        setSessions(prev => {
          const uniqueSessions = [...prev, ...mappedActiveSessions]
            .filter((session, index, self) => 
              index === self.findIndex((s) => s.session_id === session.session_id)
            )
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          return uniqueSessions;
        });

        if (!selectedSession) {
          const activeSession = mapApiSessionToSession(activeArray[0]);
          if (activeSession) setSelectedSession(activeSession);
        }
      } catch (error) {
        console.error('Error fetching active sessions:', error);
      }
    };

    // Initial fetch
    fetchActiveSessions();
    
    // Only set up the interval if we found an active session
    let interval: NodeJS.Timeout | null = null;
    if (hasActiveSession) {
      interval = setInterval(fetchActiveSessions, 30000);
    }
    
    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [selectedSession]);

  // Fetch drivers for selected session
  useEffect(() => {
    if (!selectedSession) return;

    const fetchDrivers = async () => {
      try {
        // Try database first
        const dbResponse = await fetch(`/db/drivers/${selectedSession.session_id}`);
        if (dbResponse.ok) {
          const dbDrivers = await dbResponse.json();
          if (dbDrivers.length > 0) {
            setDrivers(dbDrivers);
            return;
          }
        }

        // If not in DB, try cache
        const cacheKey = CACHE_KEYS.DRIVERS(selectedSession.session_id);
        const cachedDrivers = await redisCacheUtils.get<Driver[]>(cacheKey);
        
        if (cachedDrivers) {
          setDrivers(cachedDrivers);
          return;
        }

        // If not in cache, fetch from API
        const driversData = await apiQueue.enqueue<ApiDriverResponse[]>(
          `https://api.openf1.org/v1/drivers?session_key=${selectedSession.session_id}`
        );
        
        const mappedDrivers = driversData
          .filter((d: any) => d && d.driver_number && d.full_name)
          .map((d: any) => ({
            driver_number: d.driver_number,
            full_name: d.full_name,
            name_acronym: d.name_acronym || '',
            team_name: d.team_name || '',
            session_id: selectedSession.session_id
          }));

        // Cache the results
        await redisCacheUtils.set(cacheKey, mappedDrivers, 24 * 60 * 60 * 1000);
        setDrivers(mappedDrivers);
      } catch (error) {
        console.error('Error fetching drivers:', error);
        setDrivers([]);
      }
    };

    fetchDrivers();
  }, [selectedSession]);

  // Fetch timing data for selected session
  useEffect(() => {
    if (!selectedSession || !selectedDrivers.driver1 || !selectedDrivers.driver2) return;
    let isMounted = true;

    const fetchTimingData = async () => {
      if (!selectedSession || !selectedDrivers.driver1 || !selectedDrivers.driver2) return;
      setIsLoading(true);

      if (selectedSession.status === 'completed') {
        const driver1CacheKey = CACHE_KEYS.DRIVER_TIMING(
          selectedSession.session_id,
          selectedDrivers.driver1!
        );
        const driver2CacheKey = CACHE_KEYS.DRIVER_TIMING(
          selectedSession.session_id,
          selectedDrivers.driver2!
        );

        try {
          let driver1Data: TimingData[] | null = null;
          let driver2Data: TimingData[] | null = null;

          // Try database first
          try {
            const [dbDriver1Response, dbDriver2Response] = await Promise.all([
              fetch(`/db/timing/${selectedSession.session_id}/${selectedDrivers.driver1}`),
              fetch(`/db/timing/${selectedSession.session_id}/${selectedDrivers.driver2}`)
            ]);

            if (dbDriver1Response.ok && dbDriver2Response.ok) {
              driver1Data = await dbDriver1Response.json();
              driver2Data = await dbDriver2Response.json();
            }
          } catch (error) {
            console.log('Database fetch failed, trying cache...');
          }

          // If not in DB, try cache
          if (!driver1Data) {
            driver1Data = await redisCacheUtils.get<TimingData[]>(driver1CacheKey);
          }
          if (!driver2Data) {
            driver2Data = await redisCacheUtils.get<TimingData[]>(driver2CacheKey);
          }

          // If not in cache, fetch from API
          if (!driver1Data) {
            const rawDriver1Data = await apiQueue.enqueue(
              `/api/laps?session_key=${selectedSession.session_id}&driver_number=${selectedDrivers.driver1}`
            );
            driver1Data = Array.isArray(rawDriver1Data) ? 
              rawDriver1Data.map(t => mapLapDataToTimingData(t, selectedSession.session_id)) : [];
            if (driver1Data.length > 0) {
              await redisCacheUtils.set(driver1CacheKey, driver1Data, 24 * 60 * 60 * 1000);
            }
          }

          if (!driver2Data) {
            const rawDriver2Data = await apiQueue.enqueue(
              `/api/laps?session_key=${selectedSession.session_id}&driver_number=${selectedDrivers.driver2}`
            );
            driver2Data = Array.isArray(rawDriver2Data) ? 
              rawDriver2Data.map(t => mapLapDataToTimingData(t, selectedSession.session_id)) : [];
            if (driver2Data.length > 0) {
              await redisCacheUtils.set(driver2CacheKey, driver2Data, 24 * 60 * 60 * 1000);
            }
          }

          const combinedLapsData = [...(driver1Data || []), ...(driver2Data || [])];
          setTimingData(combinedLapsData.sort((a, b) => a.lap_number - b.lap_number));
        } catch (error) {
          console.error('Error fetching timing data:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchTimingData();

    // Only set up interval if session is active
    const isActiveSession = sessions.some(s => 
      s.session_id === selectedSession.session_id && s.status === 'active'
    );
    
    let timingInterval: NodeJS.Timeout | null = null;
    if (isActiveSession) {
      timingInterval = setInterval(fetchTimingData, 5000);
    }
    
    return () => {
      isMounted = false;
      if (timingInterval) clearInterval(timingInterval);
    };
  }, [selectedSession, selectedDrivers.driver1, selectedDrivers.driver2, sessions]);

  // Add this effect to calculate session start time when timing data changes
  useEffect(() => {
    if (!selectedSession) {
      console.log('No selected session, skipping start time calculation');
      return;
    }

    // For active sessions, always use the session date
    if (selectedSession.status === 'active') {
      const startTime = new Date(selectedSession.date);
      setSessionStartTime(startTime);
      return;
    }

    // For completed sessions with no timing data yet, use session date temporarily
    if (timingData.length === 0) {
      const tempStartTime = new Date(selectedSession.date);
      setSessionStartTime(tempStartTime);
      return;
    }

    // Now we have timing data, calculate the actual start time
    const calculatedStartTime = calculateSessionStartTime(timingData);
    
    if (calculatedStartTime) {
      setSessionStartTime(calculatedStartTime);
    } else {
      setSessionStartTime(new Date(selectedSession.date));
    }

  }, [selectedSession, timingData]);

  const setSelectedSession = async (session: Session | null) => {
    _setSelectedSession(session);
    
    // Reset all relevant state
    setSelectedDrivers({ driver1: null, driver2: null });
    setTimingData([]);
    setIsLoading(false);
    
    if (session) {
      try {
        // Try database first
        const dbResponse = await fetch(`/db/drivers/${session.session_id}`);
        let drivers: Driver[] = [];
        
        if (dbResponse.ok) {
          drivers = await dbResponse.json();
        }

        // If not in DB, try cache
        if (drivers.length === 0) {
          console.log('No drivers in DB, trying cache...');
          const cacheKey = CACHE_KEYS.DRIVERS(session.session_id);
          const cachedDrivers = await redisCacheUtils.get<Driver[]>(cacheKey);
          if (cachedDrivers) {
            drivers = cachedDrivers;
          }
        }

        // If not in cache, fetch from API
        if (drivers.length === 0) {
          console.log('No drivers in cache, fetching from API...');
          const apiData = await apiQueue.enqueue<ApiDriverResponse[]>(
            `/api/drivers?session_key=${session.session_id}`
          );
          
          drivers = apiData.map(d => ({
            driver_number: d.driver_number,
            full_name: d.full_name,
            name_acronym: d.name_acronym || '',
            team_name: d.team_name || '',
            session_id: session.session_id
          }));

          // Cache the results if we got them from API
          if (drivers.length > 0) {
            const cacheKey = CACHE_KEYS.DRIVERS(session.session_id);
            await redisCacheUtils.set(cacheKey, drivers, 24 * 60 * 60 * 1000);
          }
        }

        // Auto-select first two drivers if available
        if (drivers.length >= 2) {
          console.log('Auto-selecting first two drivers:', {
            driver1: drivers[0].driver_number,
            driver2: drivers[1].driver_number
          });
          setSelectedDrivers({
            driver1: drivers[0].driver_number,
            driver2: drivers[1].driver_number
          });
        }
      } catch (error) {
        console.error('Error fetching drivers:', error);
      }
    }
  };

  const raceEndTime = useMemo(() => {
    return calculateRaceEndTime(timingData);
  }, [timingData]);

  const initializeTrackScaling = async (sessionId: number, driverNumber: number) => {
    if (trackScalingInitialized[sessionId]) return;
    
    try {
      const scalingFactors = await calculateTrackScalingFactors(sessionId, driverNumber);
      setTrackScalingInitialized(prev => ({ ...prev, [sessionId]: true }));
    } catch (error) {
      console.error('Error calculating track scaling factors:', error);
    }
  };

  // Add new effect for track scaling initialization
  useEffect(() => {
    if (!selectedSession) return;
    initializeTrackScaling(selectedSession.session_id, 1);
  }, [selectedSession]);

  return { 
    sessions, 
    selectedSession, 
    setSelectedSession,
    drivers, 
    timingData,
    setSelectedDrivers,
    isLoading,
    sessionStartTime,
    raceEndTime,
    trackScalingInitialized
  };
}; 