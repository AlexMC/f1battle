import React from 'react';
import { Driver, TimingData } from '../types';
import { useTimingSimulation } from '../hooks/useTimingSimulation';

interface Props {
  timingData: TimingData[];
  driver1: Driver;
  driver2: Driver;
  isLiveSession: boolean;
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

const formatTime = (seconds?: number): string => {
  if (!seconds) return '-';
  
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(3);
    return `${minutes}:${remainingSeconds.padStart(6, '0')}`;
  }
  
  return seconds.toFixed(3);
};

export const LapComparison: React.FC<Props> = ({ timingData, driver1, driver2, isLiveSession }) => {
  const visibleTiming = useTimingSimulation(
    timingData, 
    isLiveSession,
    driver1.driver_number,
    driver2.driver_number
  );

  const getLapComparisonData = (): LapComparisonData[] => {
    const allLaps = [...new Set(timingData.map(t => t.lap_number))].sort((a, b) => b - a);
    
    const completedLaps = Object.keys(visibleTiming)
      .filter(lapNum => 
        visibleTiming[Number(lapNum)]?.driver1.sector3Visible || 
        visibleTiming[Number(lapNum)]?.driver2.sector3Visible
      )
      .map(Number);

    // If no laps are completed yet, show only lap 1
    const maxVisibleLap = completedLaps.length > 0 ? Math.max(...completedLaps) + 1 : 1;

    return allLaps
      .filter(lapNumber => lapNumber <= maxVisibleLap)
      .map(lapNumber => {
        const driver1Lap = timingData.find(t => t.lap_number === lapNumber && t.driver_number === driver1.driver_number);
        const driver2Lap = timingData.find(t => t.lap_number === lapNumber && t.driver_number === driver2.driver_number);
        
        return {
          lapNumber,
          driver1: {
            sector1: driver1Lap?.sector_1_time,
            sector2: driver1Lap?.sector_2_time,
            sector3: driver1Lap?.sector_3_time,
          },
          driver2: {
            sector1: driver2Lap?.sector_1_time,
            sector2: driver2Lap?.sector_2_time,
            sector3: driver2Lap?.sector_3_time,
          }
        };
      });
  };

  const compareSectorTimes = (
    time1: number | undefined,
    time2: number | undefined,
    lapNumber: number,
    sector: number,
    visibleTiming: Record<number, any>
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

  const formatSectorTime = (time: number | undefined, lapNumber: number, driverNum: number, sector: number, visibleTiming: Record<number, any>) => {
    const isVisible = visibleTiming[lapNumber]?.[`driver${driverNum}`]?.[`sector${sector}Visible`];
    if (!isVisible) return '...';
    return formatTime(time);
  };

  const formatLapTime = (lapData: { sector1?: number; sector2?: number; sector3?: number }, 
                        lapNumber: number, 
                        driverNum: number, 
                        visibleTiming: Record<number, any>) => {
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
        <tbody className="divide-y divide-gray-700 bg-gray-800">
          {lapData.map((lap) => (
            <React.Fragment key={lap.lapNumber}>
              {/* Driver 1 Row */}
              <tr className="hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{lap.lapNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{driver1.name_acronym}</td>
                {[1, 2, 3].map((sector) => (
                  <td key={sector} className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                  <div className={compareSectorTimes(
                    calculateLapTime(lap.driver1),
                    calculateLapTime(lap.driver2),
                    lap.lapNumber,
                    3,
                    visibleTiming
                  )}>
                    {formatLapTime(
                      lap.driver1,
                      lap.lapNumber,
                      1,
                      visibleTiming
                    )}
                  </div>
                </td>
              </tr>
              {/* Driver 2 Row */}
              <tr className="hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{lap.lapNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{driver2.name_acronym}</td>
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