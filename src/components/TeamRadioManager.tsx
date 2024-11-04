import React, { useState, useEffect } from 'react';
import { TeamRadio, Driver } from '../types';
import { TeamRadioModal } from './TeamRadioModal';

interface Props {
  sessionId: number;
  driver1: Driver;
  driver2: Driver;
  raceTime: number;
}

export const TeamRadioManager: React.FC<Props> = ({
  sessionId,
  driver1,
  driver2,
  raceTime
}) => {
  const [teamRadios, setTeamRadios] = useState<TeamRadio[]>([]);
  const [activeModals, setActiveModals] = useState<(TeamRadio & { uniqueId: string; raceTime: number })[]>([]);
  const [shownMessageIds, setShownMessageIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchTeamRadios = async () => {
      try {
        console.log('Fetching team radios for session:', sessionId);
        const [driver1Radios, driver2Radios] = await Promise.all([
          fetch(`/api/team_radio?session_key=${sessionId}&driver_number=${driver1.driver_number}`),
          fetch(`/api/team_radio?session_key=${sessionId}&driver_number=${driver2.driver_number}`)
        ]);

        const [driver1Data, driver2Data] = await Promise.all([
          driver1Radios.json(),
          driver2Radios.json()
        ]);

        console.log('Received radio messages:', {
          driver1: driver1Data.length,
          driver2: driver2Data.length
        });

        const sortedRadios = [...driver1Data, ...driver2Data].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        setTeamRadios(sortedRadios);
      } catch (error) {
        console.error('Error fetching team radios:', error);
      }
    };

    if (sessionId) {
      fetchTeamRadios();
    }
  }, [sessionId, driver1.driver_number, driver2.driver_number]);

  useEffect(() => {
    if (teamRadios.length === 0) return;
    
    const sessionStart = new Date(teamRadios[0].date).getTime();
    const currentTime = sessionStart + (raceTime * 1000);

    const newRadios = teamRadios.filter(radio => {
      const radioTime = new Date(radio.date).getTime();
      const messageId = `${radio.date}_${radio.driver_number}`;
      const shouldShow = radioTime <= currentTime && !shownMessageIds.has(messageId);
      
      if (shouldShow) {
        console.log('New radio message found:', {
          driver: radio.driver_number,
          time: new Date(radio.date).toISOString()
        });
      }
      
      return shouldShow;
    });

    if (newRadios.length > 0) {
      const sessionStart = new Date(teamRadios[0].date).getTime();
      const newMessageIds = newRadios.map(radio => `${radio.date}_${radio.driver_number}`);
      setShownMessageIds(prev => new Set([...prev, ...newMessageIds]));
      
      setActiveModals(prev => [
        ...prev,
        ...newRadios.map((radio, index) => ({
          ...radio,
          uniqueId: `${radio.date}_${radio.driver_number}_${prev.length + index}`,
          raceTime: (new Date(radio.date).getTime() - sessionStart) / 1000
        }))
      ]);
    }
  }, [raceTime, teamRadios]);

  return (
    <div className="fixed right-4 bottom-4 z-[9999] w-[400px]">
      <div className="flex flex-col-reverse items-end">
        {activeModals.map((radio) => {
          const driver = radio.driver_number === driver1.driver_number ? driver1 : driver2;
          return (
            <TeamRadioModal
              key={radio.uniqueId}
              radio={radio}
              driver={driver}
              raceTime={radio.raceTime}
              onClose={() => setActiveModals(prev => prev.filter(r => r.uniqueId !== radio.uniqueId))}
            />
          );
        })}
      </div>
    </div>
  );
}; 