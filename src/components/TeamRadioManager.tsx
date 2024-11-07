import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  radioMessages: {[key: number]: TeamRadio[]};
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
  sessionStartTime,
  radioMessages
}) => {
  const [dismissedMessageIds, setDismissedMessageIds] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentMessage, setCurrentMessage] = useState<VisibleMessage | null>(null);

  const visibleMessages = useMemo(() => {
    const allMessages = Object.values(radioMessages).flat();
    return allMessages
      .filter(radio => {
        const messageTime = (new Date(radio.date).getTime() - sessionStartTime.getTime()) / 1000;
        const messageId = `${radio.date}_${radio.driver_number}`;
        return messageTime <= raceTime && !dismissedMessageIds.has(messageId);
      })
      .map(radio => ({
        ...radio,
        driver: radio.driver_number === driver1.driver_number ? driver1 : driver2,
        raceTime: (new Date(radio.date).getTime() - sessionStartTime.getTime()) / 1000
      }));
  }, [radioMessages, raceTime, sessionStartTime, dismissedMessageIds, driver1, driver2]);

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