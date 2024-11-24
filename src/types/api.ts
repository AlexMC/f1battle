export interface ApiDriverResponse {
  broadcast_name: string;
  country_code: string;
  driver_number: number;
  first_name: string;
  full_name: string;
  headshot_url: string;
  last_name: string;
  meeting_key: number;
  name_acronym: string;
  session_key: number;
  team_colour: string;
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