import { useState, useEffect } from 'react';
import { TimingData } from '../types';

export const useTimingSimulation = (
  timingData: TimingData[], 
  isLiveSession: boolean,
  driver1Number: number,
  driver2Number: number
) => {
  const [visibleTiming, setVisibleTiming] = useState<Record<number, {
    driver1: { sector1Visible: boolean; sector2Visible: boolean; sector3Visible: boolean; };
    driver2: { sector1Visible: boolean; sector2Visible: boolean; sector3Visible: boolean; };
  }>>({});

  useEffect(() => {
    if (isLiveSession) {
      const allLaps = [...new Set(timingData.map(t => t.lap_number))];
      const initialTiming = allLaps.reduce((acc, lapNumber) => ({
        ...acc,
        [lapNumber]: {
          driver1: { sector1Visible: true, sector2Visible: true, sector3Visible: true },
          driver2: { sector1Visible: true, sector2Visible: true, sector3Visible: true }
        }
      }), {});
      setVisibleTiming(initialTiming);
      return;
    }

    const allLaps = [...new Set(timingData.map(t => t.lap_number))].sort((a, b) => a - b);
    if (allLaps.length === 0) return;

    const initialTiming = allLaps.reduce((acc, lapNumber) => ({
      ...acc,
      [lapNumber]: {
        driver1: { sector1Visible: false, sector2Visible: false, sector3Visible: false },
        driver2: { sector1Visible: false, sector2Visible: false, sector3Visible: false }
      }
    }), {});
    setVisibleTiming(initialTiming);

    let currentLap = 1;
    let currentSector = 1;
    let elapsedTime = 0;

    const calculateExpectedTimeForSector = (lap: number, sector: number, driverNumber: number): number => {
      let totalTime = 0;
      
      // Sum up all previous complete laps
      for (let prevLap = 1; prevLap < lap; prevLap++) {
        const lapData = timingData.find(t => 
          t.lap_number === prevLap && 
          t.driver_number === driverNumber
        );
        if (lapData) {
          totalTime += (lapData.sector_1_time || 0) + 
                      (lapData.sector_2_time || 0) + 
                      (lapData.sector_3_time || 0);
        }
      }

      // Add current lap sectors up to the requested sector
      const currentLapData = timingData.find(t => 
        t.lap_number === lap && 
        t.driver_number === driverNumber
      );
      
      if (currentLapData) {
        if (sector >= 1) totalTime += (currentLapData.sector_1_time || 0);
        if (sector >= 2) totalTime += (currentLapData.sector_2_time || 0);
        if (sector >= 3) totalTime += (currentLapData.sector_3_time || 0);
      }

      return totalTime;
    };

    const simulationInterval = setInterval(() => {
      elapsedTime += 0.5;

      setVisibleTiming(prev => {
        const newTiming = { ...prev };
        let shouldContinue = false;

        ['driver1', 'driver2'].forEach(driverKey => {
          const driverNumber = driverKey === 'driver1' ? driver1Number : driver2Number;

          for (let lap = 1; lap <= Math.max(...allLaps); lap++) {
            const expectedTime1 = calculateExpectedTimeForSector(lap, 1, driverNumber);
            const expectedTime2 = calculateExpectedTimeForSector(lap, 2, driverNumber);
            const expectedTime3 = calculateExpectedTimeForSector(lap, 3, driverNumber);

            if (elapsedTime >= expectedTime1 && !newTiming[lap][driverKey].sector1Visible) {
              newTiming[lap][driverKey].sector1Visible = true;
              shouldContinue = true;
            }
            if (elapsedTime >= expectedTime2 && !newTiming[lap][driverKey].sector2Visible) {
              newTiming[lap][driverKey].sector2Visible = true;
              shouldContinue = true;
            }
            if (elapsedTime >= expectedTime3 && !newTiming[lap][driverKey].sector3Visible) {
              newTiming[lap][driverKey].sector3Visible = true;
              shouldContinue = true;
            }
          }
        });

        return newTiming;
      });
    }, 500);

    return () => clearInterval(simulationInterval);
  }, [timingData, isLiveSession, driver1Number, driver2Number]);

  return visibleTiming;
}; 