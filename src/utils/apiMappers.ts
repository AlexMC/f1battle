import { PositionData, IntervalData } from '../types';
import { ApiPositionResponse, ApiIntervalResponse } from '../types/api';

export const mapApiPositionToPositionData = (
  apiPosition: ApiPositionResponse,
  sessionKey: number
): PositionData => ({
  date: apiPosition.date,
  driver_number: apiPosition.driver_number,
  meeting_key: apiPosition.meeting_key || 0,
  position: apiPosition.position,
  session_key: sessionKey
});

export const mapApiIntervalToIntervalData = (
  apiInterval: ApiIntervalResponse,
  sessionKey: number
): IntervalData => ({
  date: apiInterval.date,
  driver_number: apiInterval.driver_number,
  gap_to_leader: apiInterval.gap_to_leader,
  interval: apiInterval.interval,
  meeting_key: apiInterval.meeting_key || 0,
  session_key: sessionKey
}); 