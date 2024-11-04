import { useState, useEffect, useRef } from 'react';
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
  raceTime: number;
}

export const useTimingSimulation = (
  timingData: TimingData[], 
  isLiveSession: boolean,
  driver1Number: string,
  driver2Number: string,
  simulationSpeed: number = 1,
  isSimulationStarted: boolean = false,
  isPaused: boolean = false
): TimingSimulationResult => {
  const [visibleTiming, setVisibleTiming] = useState<VisibleTiming>({});
  const [isSimulationInitialized, setIsSimulationInitialized] = useState(false);
  const [raceTime, setRaceTime] = useState(0);
  const startTimeRef = useRef<number>(0);
  const lastUpdateTimeRef = useRef<number>(0);
  const elapsedTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isSimulationStarted && !isLiveSession) {
      setVisibleTiming({});
      setIsSimulationInitialized(false);
      startTimeRef.current = 0;
      lastUpdateTimeRef.current = 0;
      elapsedTimeRef.current = 0;
      setRaceTime(0);
      return;
    }

    const allLaps = [...new Set(timingData.map(t => t.lap_number))].sort((a, b) => a - b);
    if (allLaps.length === 0) return;

    if (isLiveSession) {
      const liveTiming = allLaps.reduce((acc, lapNumber) => {
        const hasDriver1Data = timingData.some(t => 
          t.lap_number === lapNumber && 
          t.driver_number === Number(driver1Number) &&
          t.sector_1_time
        );
        const hasDriver2Data = timingData.some(t => 
          t.lap_number === lapNumber && 
          t.driver_number === Number(driver2Number) &&
          t.sector_1_time
        );
        
        return {
          ...acc,
          [lapNumber]: {
            driver1: { 
              sector1Visible: hasDriver1Data, 
              sector2Visible: hasDriver1Data, 
              sector3Visible: hasDriver1Data 
            },
            driver2: { 
              sector1Visible: hasDriver2Data, 
              sector2Visible: hasDriver2Data, 
              sector3Visible: hasDriver2Data 
            }
          }
        };
      }, {});
      setVisibleTiming(liveTiming);
      setIsSimulationInitialized(true);
      return;
    }

    if (isSimulationStarted && !isSimulationInitialized) {
      const initialTiming = allLaps.reduce((acc, lapNumber) => ({
        ...acc,
        [lapNumber]: {
          driver1: { sector1Visible: false, sector2Visible: false, sector3Visible: false },
          driver2: { sector1Visible: false, sector2Visible: false, sector3Visible: false }
        }
      }), {});
      setVisibleTiming(initialTiming);
      setIsSimulationInitialized(true);
      startTimeRef.current = Date.now();
      lastUpdateTimeRef.current = Date.now();
      elapsedTimeRef.current = 0;
    }

    const simulationInterval = setInterval(() => {
      if (!isSimulationStarted || isPaused) return;

      const currentTime = Date.now();
      const deltaTime = (currentTime - lastUpdateTimeRef.current) / 1000;
      const simulatedDeltaTime = deltaTime * simulationSpeed;
      elapsedTimeRef.current += simulatedDeltaTime;
      lastUpdateTimeRef.current = currentTime;

      setRaceTime(Math.floor(elapsedTimeRef.current));

      setVisibleTiming(prev => {
        const newTiming = { ...prev };
        let shouldUpdate = false;

        ['driver1', 'driver2'].forEach(driverKey => {
          const driverNumber = driverKey === 'driver1' ? driver1Number : driver2Number;
          let totalTimeForLaps = 0;

          for (const lap of allLaps) {
            const lapData = timingData.find(t => 
              t.lap_number === lap && 
              t.driver_number === Number(driverNumber)
            );

            if (!lapData) continue;

            const sector1Time = lapData.sector_1_time || 0;
            const sector2Time = lapData.sector_2_time || 0;
            const sector3Time = lapData.sector_3_time || 0;

            if (elapsedTimeRef.current >= totalTimeForLaps + sector1Time && 
                !newTiming[lap][driverKey].sector1Visible) {
              newTiming[lap][driverKey].sector1Visible = true;
              shouldUpdate = true;
            }

            if (elapsedTimeRef.current >= totalTimeForLaps + sector1Time + sector2Time && 
                !newTiming[lap][driverKey].sector2Visible) {
              newTiming[lap][driverKey].sector2Visible = true;
              shouldUpdate = true;
            }

            if (elapsedTimeRef.current >= totalTimeForLaps + sector1Time + sector2Time + sector3Time && 
                !newTiming[lap][driverKey].sector3Visible) {
              newTiming[lap][driverKey].sector3Visible = true;
              shouldUpdate = true;
            }

            totalTimeForLaps += sector1Time + sector2Time + sector3Time;
          }
        });

        if (shouldUpdate) {
          const allComplete = allLaps.every(lap => 
            newTiming[lap]?.driver1?.sector3Visible && 
            newTiming[lap]?.driver2?.sector3Visible
          );
          
          if (allComplete) {
            clearInterval(simulationInterval);
          }
          return newTiming;
        }

        return shouldUpdate ? newTiming : prev;
      });
    }, 100);

    return () => clearInterval(simulationInterval);
  }, [timingData, isLiveSession, driver1Number, driver2Number, simulationSpeed, isSimulationStarted, isPaused]);

  return { visibleTiming, isSimulationInitialized, raceTime };
}; 