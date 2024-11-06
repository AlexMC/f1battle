import React, { useState, useEffect, useRef } from 'react';
import { TeamRadio, Driver } from '../types';
import { TeamRadioModal } from './TeamRadioModal';
import { cacheUtils } from '../utils/cache';
import { useTeamRadios } from '../hooks/useTeamRadios';

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

export const TeamRadioManager: React.FC<Props> = ({
  sessionId,
  driver1,
  driver2,
  raceTime,
  localTime,
  sessionStartTime
}) => {
  const [dismissedMessageIds, setDismissedMessageIds] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentMessage, setCurrentMessage] = useState<VisibleMessage | null>(null);

  const { visibleMessages: rawVisibleMessages } = useTeamRadios(
    sessionId,
    [driver1, driver2],
    raceTime,
    sessionStartTime,
    dismissedMessageIds
  );

  const visibleMessages: VisibleMessage[] = rawVisibleMessages.map(radio => ({
    ...radio,
    driver: radio.driver_number === driver1.driver_number ? driver1 : driver2,
    raceTime: (new Date(radio.date).getTime() - sessionStartTime.getTime()) / 1000
  }));

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