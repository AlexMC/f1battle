export interface ApiDriverResponse {
  driver_number: number;
  driver_name: string;
  team_name: string;
}

export interface ApiPositionResponse {
  date: string;
  position: number;
}

export interface ApiIntervalResponse {
  date: string;
  gap_to_leader: number;
} 