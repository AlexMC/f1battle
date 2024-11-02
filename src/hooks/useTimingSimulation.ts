import { useState, useEffect, useRef } from 'react';
import { TimingData } from '../types';

export const useTimingSimulation = (
  timingData: TimingData[], 
  isLiveSession: boolean,
  driver1Number: number,
  driver2Number: number,
  simulationSpeed: number = 1
) => {
  const [visibleTiming, setVisibleTiming] = useState<Record<number, {
    driver1: { sector1Visible: boolean; sector2Visible: boolean; sector3Visible: boolean; };
    driver2: { sector1Visible: boolean; sector2Visible: boolean; sector3Visible: boolean; };
  }>>({});
  const startTimeRef = useRef<number>(Date.now());
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const elapsedTimeRef = useRef<number>(0);

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

    // Initialize timing state if not already set
    if (Object.keys(visibleTiming).length === 0) {
      const initialTiming = allLaps.reduce((acc, lapNumber) => ({
        ...acc,
        [lapNumber]: {
          driver1: { sector1Visible: false, sector2Visible: false, sector3Visible: false },
          driver2: { sector1Visible: false, sector2Visible: false, sector3Visible: false }
        }
      }), {});
      setVisibleTiming(initialTiming);
      startTimeRef.current = Date.now();
      lastUpdateTimeRef.current = Date.now();
      elapsedTimeRef.current = 0;
    }

    const simulationInterval = setInterval(() => {
      const currentTime = Date.now();
      const deltaTime = (currentTime - lastUpdateTimeRef.current) / 1000; // Convert to seconds
      const simulatedDeltaTime = deltaTime * simulationSpeed;
      elapsedTimeRef.current += simulatedDeltaTime;
      lastUpdateTimeRef.current = currentTime;

      setVisibleTiming(prev => {
        const newTiming = { ...prev };
        let shouldUpdate = false;

        ['driver1', 'driver2'].forEach(driverKey => {
          const driverNumber = driverKey === 'driver1' ? driver1Number : driver2Number;
          let accumulatedTime = 0;

          allLaps.forEach(lap => {
            const lapData = timingData.find(t => t.lap_number === lap && t.driver_number === driverNumber);
            if (!lapData) return;

            // Calculate sector visibility based on accumulated time
            if (elapsedTimeRef.current >= accumulatedTime && !newTiming[lap][driverKey].sector1Visible) {
              newTiming[lap][driverKey].sector1Visible = true;
              shouldUpdate = true;
            }
            accumulatedTime += lapData.sector_1_time || 0;

            if (elapsedTimeRef.current >= accumulatedTime && !newTiming[lap][driverKey].sector2Visible) {
              newTiming[lap][driverKey].sector2Visible = true;
              shouldUpdate = true;
            }
            accumulatedTime += lapData.sector_2_time || 0;

            if (elapsedTimeRef.current >= accumulatedTime && !newTiming[lap][driverKey].sector3Visible) {
              newTiming[lap][driverKey].sector3Visible = true;
              shouldUpdate = true;
            }
            accumulatedTime += lapData.sector_3_time || 0;
          });
        });

        return shouldUpdate ? newTiming : prev;
      });
    }, 100);

    return () => clearInterval(simulationInterval);
  }, [timingData, isLiveSession, driver1Number, driver2Number, simulationSpeed]);

  return visibleTiming;
}; 