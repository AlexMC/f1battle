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

  const driverTotalTimes = timingData.reduce((acc: number[], lap) => {
    const sector1 = lap.sector_1_time || 0;
    const sector2 = lap.sector_2_time || 0;
    const sector3 = lap.sector_3_time || 0;
    const totalTime = sector1 + sector2 + sector3;
    
    if (totalTime > 0) {
      acc.push(totalTime);
    }
    return acc;
  }, []);

  return Math.max(...driverTotalTimes);
}; 