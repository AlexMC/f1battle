export interface ApiDriverResponse {
  driver_number: number;
  driver_name: string;
  team_name: string;
}

export interface ApiPositionResponse {
  date: string;
  driver_number: number;
  meeting_key?: number;
  position: number;
}

export interface ApiIntervalResponse {
  date: string;
  driver_number: number;
  meeting_key?: number;
  gap_to_leader: number;
  interval: number;
} 