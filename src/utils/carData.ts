import { CarData } from '../types';

export const findCarDataAtTime = (
  carData: CarData[],
  raceTime: number,
  sessionStartTime: Date
): CarData | null => {
  if (!carData.length) return null;

  // Sort data by date
  const sortedData = [...carData].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Find the closest data point to the current race time
  const targetTime = new Date(sessionStartTime.getTime() + raceTime * 1000);
  
  let closestData = sortedData[0];
  let minTimeDiff = Math.abs(new Date(closestData.date).getTime() - targetTime.getTime());

  for (const data of sortedData) {
    const timeDiff = Math.abs(new Date(data.date).getTime() - targetTime.getTime());
    if (timeDiff < minTimeDiff) {
      minTimeDiff = timeDiff;
      closestData = data;
    }
  }

  return closestData;
}; 