import React, { useState, useEffect, useRef } from 'react';
import { TeamRadio, Driver } from '../types';
import { TeamRadioModal } from './TeamRadioModal';
import { cacheUtils } from '../utils/cache';

interface Props {
  sessionId: number;
  driver1: Driver;
  driver2: Driver;
  raceTime: number;
  localTime: Date;
  sessionStartTime: Date;
}

interface VisibleMessage extends TeamRadio {
  driver: Driver;
  raceTime: number;
}

const RADIO_CACHE_KEY = (sessionId: number, driverNumber: number) =>
  `f1_radio_${sessionId}_${driverNumber}`;

export const TeamRadioManager: React.FC<Props> = ({
  sessionId,
  driver1,
  driver2,
  raceTime,
  localTime,
  sessionStartTime
}) => {
  const [teamRadios, setTeamRadios] = useState<TeamRadio[]>([]);
  const [visibleMessages, setVisibleMessages] = useState<VisibleMessage[]>([]);
  const [dismissedMessageIds, setDismissedMessageIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentMessage, setCurrentMessage] = useState<VisibleMessage | null>(null);

  useEffect(() => {
    const fetchTeamRadios = async () => {
      try {
        const driver1CacheKey = RADIO_CACHE_KEY(sessionId, driver1.driver_number);
        const driver2CacheKey = RADIO_CACHE_KEY(sessionId, driver2.driver_number);

        let driver1Data = cacheUtils.get<TeamRadio[]>(driver1CacheKey);
        let driver2Data = cacheUtils.get<TeamRadio[]>(driver2CacheKey);

        if (!driver1Data) {
          const driver1Response = await fetch(`/api/team_radio?session_key=${sessionId}&driver_number=${driver1.driver_number}`);
          driver1Data = await driver1Response.json();
          cacheUtils.set(driver1CacheKey, driver1Data, 24 * 60 * 60 * 1000);
        }

        if (!driver2Data) {
          const driver2Response = await fetch(`/api/team_radio?session_key=${sessionId}&driver_number=${driver2.driver_number}`);
          driver2Data = await driver2Response.json();
          cacheUtils.set(driver2CacheKey, driver2Data, 24 * 60 * 60 * 1000);
        }

        console.log('Received radio messages:', {
          driver1: driver1Data?.length ?? 0,
          driver2: driver2Data?.length ?? 0
        });

        const sortedRadios = [...(driver1Data || []), ...(driver2Data || [])].sort((a, b) => 
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
    if (!teamRadios.length) return;

    const uniqueMessages = new Map();

    teamRadios
      .filter(radio => {
        const messageRaceTime = (new Date(radio.date).getTime() - sessionStartTime.getTime()) / 1000;
        return messageRaceTime <= raceTime && !dismissedMessageIds.has(`${radio.date}_${radio.driver_number}`);
      })
      .forEach((radio, index) => {
        const key = `${radio.date}_${radio.driver_number}_${index}`;
        if (!uniqueMessages.has(key)) {
          uniqueMessages.set(key, {
            ...radio,
            driver: radio.driver_number === driver1.driver_number ? driver1 : driver2,
            raceTime: (new Date(radio.date).getTime() - sessionStartTime.getTime()) / 1000
          });
        }
      });

    setVisibleMessages(Array.from(uniqueMessages.values()));
  }, [raceTime, teamRadios, driver1, driver2, dismissedMessageIds, sessionStartTime]);

  const handleDismissMessage = (radio: VisibleMessage) => {
    const messageId = `${radio.date}_${radio.driver_number}`;
    setDismissedMessageIds(prev => new Set([...prev, messageId]));
  };

  return (
    <div className="fixed right-4 bottom-4 z-[9999] w-[400px]">
      <div className="flex flex-col-reverse items-end">
        {visibleMessages.map((radio) => (
          <TeamRadioModal
            key={`${radio.date}_${radio.driver_number}_${visibleMessages.indexOf(radio)}`}
            radio={radio}
            driver={radio.driver}
            raceTime={radio.raceTime}
            onClose={() => handleDismissMessage(radio)}
          />
        ))}
      </div>
    </div>
  );
}; 