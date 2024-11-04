import React, { useEffect } from 'react';
import { Driver, TimingData } from '../types';
import { useTimingSimulation } from '../hooks/useTimingSimulation';
import { LoadingSpinner } from './LoadingSpinner';
import { getTeamColor } from '../utils/colors';

interface Props {
  timingData: TimingData[];
  driver1: Driver;
  driver2: Driver;
  isLiveSession: boolean;
  simulationSpeed: number;
  isLoading: boolean;
  isSimulationStarted: boolean;
  onRaceTimeUpdate: (time: number) => void;
}

interface LapComparisonData {
  lapNumber: number;
  driver1: {
    sector1?: number;
    sector2?: number;
    sector3?: number;
  };
  driver2: {
    sector1?: number;
    sector2?: number;
    sector3?: number;
  };
}

type VisibleTiming = Record<number, {
  driver1: {
    sector1Visible: boolean;
    sector2Visible: boolean;
    sector3Visible: boolean;
  };
  driver2: {
    sector1Visible: boolean;
    sector2Visible: boolean;
    sector3Visible: boolean;
  };
}>;

const formatTime = (seconds?: number): string => {
  if (!seconds) return '-';
  
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(3);
    return `${minutes}:${remainingSeconds.padStart(6, '0')}`;
  }
  
  return seconds.toFixed(3);
};

export const LapComparison: React.FC<Props> = ({ 
  timingData, 
  driver1, 
  driver2, 
  isLiveSession, 
  simulationSpeed,
  isLoading,
  isSimulationStarted,
  onRaceTimeUpdate 
}) => {
  const { visibleTiming, isSimulationInitialized, raceTime } = useTimingSimulation(
    timingData, 
    isLiveSession,
    driver1.driver_number.toString(),
    driver2.driver_number.toString(),
    simulationSpeed,
    isSimulationStarted
  );

  useEffect(() => {
    onRaceTimeUpdate(raceTime);
  }, [raceTime, onRaceTimeUpdate]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const getLapComparisonData = (): LapComparisonData[] => {
    if (!isSimulationInitialized && !isLiveSession) {
      return [];
    }
    
    const allLaps = [...new Set(timingData.map(t => t.lap_number))].sort((a, b) => b - a);
    
    // Only show data if we have visible timing
    if (Object.keys(visibleTiming).length === 0) {
      return [];
    }

    // Only show laps that have at least one visible sector
    const visibleLaps = Object.entries(visibleTiming)
      .filter(([_, lapData]) => 
        lapData.driver1.sector1Visible || 
        lapData.driver2.sector1Visible
      )
      .map(([lapNum]) => Number(lapNum));

    // If no laps are visible yet, don't show any
    if (visibleLaps.length === 0) {
      return [];
    }

    // Get the maximum visible lap
    const maxVisibleLap = Math.max(...visibleLaps);

    return allLaps
      .filter(lapNumber => lapNumber <= maxVisibleLap)
      .map(lapNumber => {
        const driver1Lap = timingData.find(t => 
          t.lap_number === lapNumber && 
          t.driver_number === driver1.driver_number
        );
        const driver2Lap = timingData.find(t => 
          t.lap_number === lapNumber && 
          t.driver_number === driver2.driver_number
        );
        
        return {
          lapNumber,
          driver1: {
            sector1: visibleTiming[lapNumber]?.driver1.sector1Visible ? driver1Lap?.sector_1_time : undefined,
            sector2: visibleTiming[lapNumber]?.driver1.sector2Visible ? driver1Lap?.sector_2_time : undefined,
            sector3: visibleTiming[lapNumber]?.driver1.sector3Visible ? driver1Lap?.sector_3_time : undefined,
          },
          driver2: {
            sector1: visibleTiming[lapNumber]?.driver2.sector1Visible ? driver2Lap?.sector_1_time : undefined,
            sector2: visibleTiming[lapNumber]?.driver2.sector2Visible ? driver2Lap?.sector_2_time : undefined,
            sector3: visibleTiming[lapNumber]?.driver2.sector3Visible ? driver2Lap?.sector_3_time : undefined,
          }
        };
      });
  };

  const compareSectorTimes = (
    time1: number | undefined,
    time2: number | undefined,
    lapNumber: number,
    sector: number,
    visibleTiming: VisibleTiming
  ): string | undefined => {
    if (!time1 || !time2) return undefined;
    
    const driver1Visible = visibleTiming[lapNumber]?.driver1[`sector${sector}Visible`];
    const driver2Visible = visibleTiming[lapNumber]?.driver2[`sector${sector}Visible`];
    
    if (!driver1Visible || !driver2Visible) return undefined;
    
    return time1 < time2 ? 'text-green-400' : 'text-red-400';
  };

  const calculateLapTime = (driverData: { sector1?: number; sector2?: number; sector3?: number }): number | undefined => {
    if (!driverData.sector1 || !driverData.sector2 || !driverData.sector3) return undefined;
    return driverData.sector1 + driverData.sector2 + driverData.sector3;
  };

  const lapData = getLapComparisonData();

  const formatSectorTime = (
    time: number | undefined, 
    lapNumber: number, 
    driverNum: number, 
    sector: number, 
    visibleTiming: VisibleTiming
  ) => {
    // Return dash if timing object isn't initialized yet
    if (!visibleTiming[lapNumber]) {
      return '-';
    }
    
    const isVisible = visibleTiming[lapNumber][`driver${driverNum}`][`sector${sector}Visible`];
    if (!isVisible || time === undefined) {
      return '-';
    }
    
    return formatTime(time);
  };

  const formatLapTime = (
    lapData: { sector1?: number; sector2?: number; sector3?: number }, 
    lapNumber: number, 
    driverNum: number, 
    visibleTiming: VisibleTiming
  ) => {
    const isAllSectorsVisible = visibleTiming[lapNumber]?.[`driver${driverNum}`]?.sector3Visible;
    if (!isAllSectorsVisible) return '...';
    
    const totalTime = calculateLapTime(lapData);
    return formatTime(totalTime);
  };

  return (
    <div className="overflow-x-auto bg-gray-800 rounded-lg shadow-xl">
      <table className="min-w-full divide-y divide-gray-700">
        <thead>
          <tr className="bg-gray-900">
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">Lap</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">Driver</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">Sector 1</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">Sector 2</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">Sector 3</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-200">Lap Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-600">
          {lapData.map((lap) => (
            <React.Fragment key={lap.lapNumber}>
              <tr className="hover:bg-gray-700 transition-colors">
                <td rowSpan={2} className="px-6 py-4 whitespace-nowrap text-sm text-gray-200 text-center align-middle bg-gray-750">
                  {lap.lapNumber}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm border-b border-gray-700">
                  <span className={`${getTeamColor(driver1.team_name)} font-semibold`}>
                    {driver1.name_acronym} ({driver1.driver_number})
                  </span>
                </td>
                {[1, 2, 3].map((sector) => (
                  <td key={sector} className="px-6 py-4 whitespace-nowrap text-sm text-gray-200 border-b border-gray-700">
                    <div className={compareSectorTimes(
                      lap.driver1[`sector${sector}` as keyof typeof lap.driver1],
                      lap.driver2[`sector${sector}` as keyof typeof lap.driver2],
                      lap.lapNumber,
                      sector,
                      visibleTiming
                    )}>
                      {formatSectorTime(
                        lap.driver1[`sector${sector}` as keyof typeof lap.driver1],
                        lap.lapNumber,
                        1,
                        sector,
                        visibleTiming
                      )}
                    </div>
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200 border-b border-gray-700">
                  <div className={compareSectorTimes(
                    calculateLapTime(lap.driver1),
                    calculateLapTime(lap.driver2),
                    lap.lapNumber,
                    3,
                    visibleTiming
                  )}>
                    {formatLapTime(lap.driver1, lap.lapNumber, 1, visibleTiming)}
                  </div>
                </td>
              </tr>
              <tr className="hover:bg-gray-700 transition-colors border-b border-gray-500">
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`${getTeamColor(driver2.team_name)} font-semibold`}>
                    {driver2.name_acronym} ({driver2.driver_number})
                  </span>
                </td>
                {[1, 2, 3].map((sector) => (
                  <td key={sector} className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                    <div className={compareSectorTimes(
                      lap.driver2[`sector${sector}` as keyof typeof lap.driver2],
                      lap.driver1[`sector${sector}` as keyof typeof lap.driver1],
                      lap.lapNumber,
                      sector,
                      visibleTiming
                    )}>
                      {formatSectorTime(
                        lap.driver2[`sector${sector}` as keyof typeof lap.driver2],
                        lap.lapNumber,
                        2,
                        sector,
                        visibleTiming
                      )}
                    </div>
                  </td>
                ))}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                  <div className={compareSectorTimes(
                    calculateLapTime(lap.driver2),
                    calculateLapTime(lap.driver1),
                    lap.lapNumber,
                    3,
                    visibleTiming
                  )}>
                    {formatLapTime(lap.driver2, lap.lapNumber, 2, visibleTiming)}
                  </div>
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}; 