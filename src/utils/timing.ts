import { IntervalData, PositionData } from '../types';

export const findDataAtTime = <T extends IntervalData | PositionData>(
  data: T[],
  raceTime: number,
  sessionStartTime: Date
): T | null => {
  if (!data.length) return null;
  
  const sortedData = [...data].sort((a, b) => {
    const timeA = new Date(a.date.replace('+00:00', 'Z')).getTime() - sessionStartTime.getTime();
    const timeB = new Date(b.date.replace('+00:00', 'Z')).getTime() - sessionStartTime.getTime();
    return timeA - timeB;
  });

  let closestData = sortedData[0];
  let closestTime = (new Date(closestData.date.replace('+00:00', 'Z')).getTime() - sessionStartTime.getTime()) / 1000;

  for (const item of sortedData) {
    const itemTime = (new Date(item.date.replace('+00:00', 'Z')).getTime() - sessionStartTime.getTime()) / 1000;
    
    // Only consider data points from the past
    if (itemTime <= raceTime && itemTime > closestTime) {
      closestTime = itemTime;
      closestData = item;
    }
  }
  
  return closestData;
}; 