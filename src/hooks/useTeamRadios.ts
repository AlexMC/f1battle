import { useState, useEffect, useMemo } from 'react';
import { TeamRadio, Driver } from '../types';
import { redisCacheUtils } from '../utils/redisCache';
import { apiQueue } from '../utils/apiQueue';

export const RADIO_CACHE_KEY = (sessionId: number, driverNumber: number) =>
  `f1_radio_${sessionId}_${driverNumber}`;

interface UseTeamRadiosResult {
  radioMessages: {[key: number]: TeamRadio[]};
  isLoading: boolean;
  visibleMessages: TeamRadio[];
}

export const useTeamRadios = (
  sessionId: number,
  drivers: Driver[],
  raceTime: number,
  sessionStartTime: Date,
  dismissedMessageIds?: Set<string>
): UseTeamRadiosResult => {
  const [radioMessages, setRadioMessages] = useState<{[key: number]: TeamRadio[]}>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRadioMessages = async () => {
      if (!sessionId || drivers.length === 0) return;

      try {
        const radioPromises = drivers.map(async driver => {
          const cacheKey = RADIO_CACHE_KEY(sessionId, driver.driver_number);
          const cachedData = await redisCacheUtils.get<TeamRadio[]>(cacheKey);
          
          if (cachedData) return { driver: driver, data: cachedData };

          const data = await apiQueue.enqueue<TeamRadio[]>(
            `/api/team_radio?session_key=${sessionId}&driver_number=${driver.driver_number}`
          );
          await redisCacheUtils.set(cacheKey, data, 24 * 60 * 60 * 1000);
          return { driver: driver, data };
        });

        const results = await Promise.all(radioPromises);
        const newRadioMessages = results.reduce((acc, { driver, data }) => {
          acc[driver.driver_number] = data;
          return acc;
        }, {} as {[key: number]: TeamRadio[]});

        setRadioMessages(newRadioMessages);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching radio messages:', error);
        setIsLoading(false);
      }
    };

    fetchRadioMessages();
  }, [sessionId, JSON.stringify(drivers.map(d => d.driver_number))]);

  // Calculate visible messages based on race time
  const visibleMessages = useMemo(() => {
    const allMessages = Object.values(radioMessages).flat();
    if (!allMessages.length) return [];

    return allMessages.filter(radio => {
      const messageTime = (new Date(radio.date).getTime() - sessionStartTime.getTime()) / 1000;
      const messageId = `${radio.date}_${radio.driver_number}`;
      return messageTime <= raceTime && (!dismissedMessageIds || !dismissedMessageIds.has(messageId));
    });
  }, [radioMessages, raceTime, sessionStartTime, dismissedMessageIds]);

  return { radioMessages, isLoading, visibleMessages };
}; 