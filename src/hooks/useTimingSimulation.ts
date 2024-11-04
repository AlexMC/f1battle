import { useState, useEffect } from 'react';
import { TimingData } from '../types';

interface VisibleTiming {
  [lapNumber: number]: {
    driver1: { sector1Visible: boolean; sector2Visible: boolean; sector3Visible: boolean; };
    driver2: { sector1Visible: boolean; sector2Visible: boolean; sector3Visible: boolean; };
  };
}

interface TimingSimulationResult {
  visibleTiming: VisibleTiming;
  isSimulationInitialized: boolean;
}

export const useTimingSimulation = (
  timingData: TimingData[], 
  isLiveSession: boolean,
  driver1Number: string,
  driver2Number: string,
  raceTime: number
): TimingSimulationResult => {
  const [visibleTiming, setVisibleTiming] = useState<VisibleTiming>({});
  const [isSimulationInitialized, setIsSimulationInitialized] = useState(false);

  useEffect(() => {
    const allLaps = [...new Set(timingData.map(t => t.lap_number))].sort((a, b) => a - b);
    if (allLaps.length === 0) return;

    if (isLiveSession) {
      const liveTiming = allLaps.reduce((acc, lapNumber) => ({
        ...acc,
        [lapNumber]: {
          driver1: { 
            sector1Visible: true, 
            sector2Visible: true, 
            sector3Visible: true 
          },
          driver2: { 
            sector1Visible: true, 
            sector2Visible: true, 
            sector3Visible: true 
          }
        }
      }), {});
      setVisibleTiming(liveTiming);
      setIsSimulationInitialized(true);
      return;
    }

    const newTiming: VisibleTiming = {};
    
    ['driver1', 'driver2'].forEach(driverKey => {
      const driverNumber = driverKey === 'driver1' ? driver1Number : driver2Number;
      let totalTimeForLaps = 0;

      for (const lap of allLaps) {
        const lapData = timingData.find(t => 
          t.lap_number === lap && 
          t.driver_number === Number(driverNumber)
        );

        if (!lapData) continue;

        if (!newTiming[lap]) {
          newTiming[lap] = {
            driver1: { sector1Visible: false, sector2Visible: false, sector3Visible: false },
            driver2: { sector1Visible: false, sector2Visible: false, sector3Visible: false }
          };
        }

        const sector1Time = lapData.sector_1_time || 0;
        const sector2Time = lapData.sector_2_time || 0;
        const sector3Time = lapData.sector_3_time || 0;

        newTiming[lap][driverKey].sector1Visible = raceTime >= totalTimeForLaps + sector1Time;
        newTiming[lap][driverKey].sector2Visible = raceTime >= totalTimeForLaps + sector1Time + sector2Time;
        newTiming[lap][driverKey].sector3Visible = raceTime >= totalTimeForLaps + sector1Time + sector2Time + sector3Time;

        totalTimeForLaps += sector1Time + sector2Time + sector3Time;
      }
    });

    setVisibleTiming(newTiming);
    setIsSimulationInitialized(true);
  }, [timingData, isLiveSession, driver1Number, driver2Number, raceTime]);

  return { visibleTiming, isSimulationInitialized };
}; 