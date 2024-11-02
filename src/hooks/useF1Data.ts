import { useState, useEffect } from 'react';
import { Driver, TimingData, Session } from '../types';

const mapApiSessionToSession = (apiSession: any): Session | null => {
  if (!apiSession || typeof apiSession !== 'object') return null;

  // Map API status to our status
  let status = 'unknown';
  if (apiSession.status) {
    switch (apiSession.status.toLowerCase()) {
      case 'completed':
      case 'finished':
        status = 'completed';
        break;
      case 'ongoing':
      case 'started':
        status = 'active';
        break;
      case 'scheduled':
      case 'upcoming':
        status = 'scheduled';
        break;
      default:
        status = 'unknown';
    }
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
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [timingData, setTimingData] = useState<TimingData[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<{ driver1?: number; driver2?: number }>({});
  const [has2024Data, setHas2024Data] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Separate effect for fetching 2024 sessions (one-time)
  useEffect(() => {
    let isMounted = true;

    const fetch2024Sessions = async () => {
      if (has2024Data) return;
      
      try {
        const response = await fetch('/api/sessions?year=2024');
        const data = await response.json();

        if (!isMounted) return;

        const data2024Array = Array.isArray(data) ? data : [];
        const mapped2024Sessions = data2024Array
          .map(mapApiSessionToSession)
          .filter((session): session is Session => session !== null);

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
      try {
        const response = await fetch(`https://api.openf1.org/v1/drivers?session_key=${selectedSession.session_id}`);
        console.log('Drivers response status:', response.status);
        const driversData = await response.json();
        console.log('Drivers data:', driversData);
        
        // Map the API response to our Driver interface
        const mappedDrivers = driversData
          .filter((d: any) => d && d.driver_number && d.full_name)
          .map((d: any) => ({
            driver_number: d.driver_number,
            full_name: d.full_name,
            name_acronym: d.name_acronym || '',
            team_name: d.team_name || '',
            session_id: selectedSession.session_id
          }));

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
      try {
        // Fetch lap times for each driver separately
        const [driver1Laps, driver2Laps] = await Promise.all([
          fetch(`https://api.openf1.org/v1/laps?session_key=${selectedSession.session_id}&driver_number=${selectedDrivers.driver1}`),
          fetch(`https://api.openf1.org/v1/laps?session_key=${selectedSession.session_id}&driver_number=${selectedDrivers.driver2}`)
        ]);

        const driver1Data = await driver1Laps.json();
        const driver2Data = await driver2Laps.json();
        const combinedLapsData = [...driver1Data, ...driver2Data];

        console.log('Combined laps data:', combinedLapsData);

        if (!isMounted) return;

        // Map API response to our TimingData interface
        const mappedTiming = combinedLapsData
          .filter((t: any) => t && t.driver_number)
          .map((t: any) => ({
            driver_number: t.driver_number,
            lap_number: t.lap_number,
            sector_1_time: t.duration_sector_1,
            sector_2_time: t.duration_sector_2,
            sector_3_time: t.duration_sector_3,
            lap_time: t.lap_duration,
            session_id: selectedSession.session_id,
            timestamp: t.date
          }));

        if (isMounted) {
          setTimingData(mappedTiming);
        }
      } catch (error) {
        console.error('Error fetching timing data:', error);
        if (isMounted) setTimingData([]);
      } finally {
        setIsLoading(false);
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