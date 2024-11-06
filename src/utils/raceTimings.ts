import { TimingData } from '../types';

export const calculateSessionStartTime = (timingData: TimingData[]): Date | null => {
  const sortedData = [...timingData].sort((a, b) => 
    a.lap_number - b.lap_number || 
    (a.timestamp - b.timestamp)
  );

  const lap2Data = sortedData.find(t => t.lap_number === 2);

  if (!lap2Data || !lap2Data.timestamp || !lap2Data.sector_2_time || !lap2Data.sector_3_time) {
    return null;
  }

  const lap2Time = new Date(lap2Data.timestamp);
  const sectorsDuration = (lap2Data.sector_2_time + lap2Data.sector_3_time) * 1000;
  const calculatedTime = new Date(lap2Time.getTime() - sectorsDuration);
  
  return calculatedTime;
};

export const calculateRaceEndTime = (timingData: TimingData[]): number => {
  if (timingData.length === 0) return 0;

  const sessionStart = calculateSessionStartTime(timingData);
  if (!sessionStart) return 0;
  
  // Group laps by driver
  const driverLaps = timingData.reduce((acc: { [key: number]: TimingData[] }, lap) => {
    if (!acc[lap.driver_number]) {
      acc[lap.driver_number] = [];
    }
    acc[lap.driver_number].push(lap);
    return acc;
  }, {});

  // Find the last lap for each driver and calculate their finish time
  const driverFinishTimes = Object.values(driverLaps).map(laps => {
    // Sort laps by lap number to get the last one
    const sortedLaps = [...laps].sort((a, b) => b.lap_number - a.lap_number);
    const lastLap = sortedLaps[0];

    if (!lastLap || !lastLap.timestamp) return 0;

    // Calculate total time for the last lap
    const sector1 = lastLap.sector_1_time || 0;
    const sector2 = lastLap.sector_2_time || 0;
    const sector3 = lastLap.sector_3_time || 0;
    const totalSectorTime = sector1 + sector2 + sector3;

    // Calculate duration from session start in seconds
    const duration = ((lastLap.timestamp - sessionStart.getTime()) / 1000) + totalSectorTime;
    return duration;
  });

  const maxFinishTime = Math.max(...driverFinishTimes);
  console.log('Race end time calculated:', {
    maxFinishTime,
    formattedDuration: new Date(maxFinishTime * 1000).toISOString().substr(11, 8),
    driverFinishTimes,
    sessionStart: sessionStart.toISOString()
  });

  return maxFinishTime;
}; 