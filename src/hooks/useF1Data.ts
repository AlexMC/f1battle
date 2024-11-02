import { useState, useEffect } from 'react';
import { Driver, TimingData, Session } from '../types';
import { cacheUtils } from '../utils/cache';

const CACHE_KEYS = {
  SESSIONS_2024: 'f1_sessions_2024',
  DRIVERS: (sessionId: number) => `f1_drivers_${sessionId}`,
  DRIVER_TIMING: (sessionId: number, driverNumber: number) => 
    `f1_timing_${sessionId}_${driverNumber}`
};

const mapApiSessionToSession = (apiSession: any): Session | null => {
  if (!apiSession || typeof apiSession !== 'object') return null;

  // Determine status based on dates since API doesn't provide status
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

  console.log('Session status determined:', {
    sessionId: apiSession.session_key,
    startDate,
    endDate,
    status
  });

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

const formatTime = (seconds?: number): string => {
  if (!seconds) return '-';
  
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(3);
    return `${minutes}:${remainingSeconds.padStart(6, '0')}`;
  }
  
  return seconds.toFixed(3);
};

export const useF1Data = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, _setSelectedSession] = useState<Session | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [timingData, setTimingData] = useState<TimingData[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<{ driver1: number | null; driver2: number | null }>({ driver1: null, driver2: null });
  const [has2024Data, setHas2024Data] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Separate effect for fetching 2024 sessions (one-time)
  useEffect(() => {
    let isMounted = true;

    const fetch2024Sessions = async () => {
      if (has2024Data) return;
      
      // Try to get from cache first
      const cachedSessions = cacheUtils.get<Session[]>(CACHE_KEYS.SESSIONS_2024);
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

      try {
        const response = await fetch('/api/sessions?year=2024');
        const data = await response.json();
        console.log('2024 Sessions API response:', data);

        if (!isMounted) return;

        const data2024Array = Array.isArray(data) ? data : [];
        const mapped2024Sessions = data2024Array
          .map(mapApiSessionToSession)
          .filter((session): session is Session => session !== null);

        // Cache the results
        cacheUtils.set(CACHE_KEYS.SESSIONS_2024, mapped2024Sessions);

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
    let interval: number | null = null;
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
      // Try to get from cache first
      const cacheKey = CACHE_KEYS.DRIVERS(selectedSession.session_id);
      const cachedDrivers = cacheUtils.get<Driver[]>(cacheKey);
      
      if (cachedDrivers) {
        setDrivers(cachedDrivers);
        return;
      }

      try {
        const response = await fetch(`https://api.openf1.org/v1/drivers?session_key=${selectedSession.session_id}`);
        const driversData = await response.json();
        
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
        cacheUtils.set(cacheKey, mappedDrivers);
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
      setIsLoading(true);

      // Only use cache for completed sessions with valid drivers
      if (selectedSession.status === 'completed') {
        const driver1CacheKey = CACHE_KEYS.DRIVER_TIMING(
          selectedSession.session_id,
          selectedDrivers.driver1!
        );
        const driver2CacheKey = CACHE_KEYS.DRIVER_TIMING(
          selectedSession.session_id,
          selectedDrivers.driver2!
        );
        
        const cachedDriver1 = cacheUtils.get<TimingData[]>(driver1CacheKey);
        const cachedDriver2 = cacheUtils.get<TimingData[]>(driver2CacheKey);
        
        if (cachedDriver1 && cachedDriver2) {
          if (isMounted) {
            setTimingData([...cachedDriver1, ...cachedDriver2]);
            setIsLoading(false);
          }
          return;
        }

        // If we have one driver cached, only fetch the other
        try {
          let driver1Data = cachedDriver1;
          let driver2Data = cachedDriver2;

          if (!cachedDriver1) {
            const driver1Response = await fetch(`/api/laps?session_key=${selectedSession.session_id}&driver_number=${selectedDrivers.driver1}`);
            const rawDriver1Data = await driver1Response.json();
            driver1Data = Array.isArray(rawDriver1Data) ? rawDriver1Data.map((t: any) => ({
              driver_number: t.driver_number,
              lap_number: t.lap_number,
              sector_1_time: t.duration_sector_1,
              sector_2_time: t.duration_sector_2,
              sector_3_time: t.duration_sector_3,
              lap_time: t.lap_duration,
              gap_to_leader: t.gap_to_leader,
              session_id: selectedSession.session_id,
              timestamp: t.date
            })) : [];
            if (selectedSession.status === 'completed') {
              cacheUtils.set(driver1CacheKey, driver1Data, 24 * 60 * 60 * 1000);
            }
          }

          if (!cachedDriver2) {
            const driver2Response = await fetch(`/api/laps?session_key=${selectedSession.session_id}&driver_number=${selectedDrivers.driver2}`);
            const rawDriver2Data = await driver2Response.json();
            driver2Data = Array.isArray(rawDriver2Data) ? rawDriver2Data.map((t: any) => ({
              driver_number: t.driver_number,
              lap_number: t.lap_number,
              sector_1_time: t.duration_sector_1,
              sector_2_time: t.duration_sector_2,
              sector_3_time: t.duration_sector_3,
              lap_time: t.lap_duration,
              gap_to_leader: t.gap_to_leader,
              session_id: selectedSession.session_id,
              timestamp: t.date
            })) : [];
            if (selectedSession.status === 'completed') {
              cacheUtils.set(driver2CacheKey, driver2Data, 24 * 60 * 60 * 1000);
            }
          }

          if (!isMounted) return;

          const combinedLapsData = [...(driver1Data || []), ...(driver2Data || [])];
          setTimingData(combinedLapsData.sort((a, b) => a.lap_number - b.lap_number));
        } catch (error) {
          console.error('Error fetching timing data:', error);
          if (isMounted) setTimingData([]);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      }
    };

    fetchTimingData();

    // Only set up interval if session is active
    const isActiveSession = sessions.some(s => 
      s.session_id === selectedSession.session_id && s.status === 'active'
    );
    
    let timingInterval: number | null = null;
    if (isActiveSession) {
      timingInterval = setInterval(fetchTimingData, 5000);
    }
    
    return () => {
      isMounted = false;
      if (timingInterval) clearInterval(timingInterval);
    };
  }, [selectedSession, selectedDrivers.driver1, selectedDrivers.driver2, sessions]);

  const setSelectedSession = (session: Session | null) => {
    _setSelectedSession(session);
  };

  return { 
    sessions, 
    selectedSession, 
    setSelectedSession,
    drivers, 
    timingData,
    setSelectedDrivers,
    isLoading 
  };
}; 