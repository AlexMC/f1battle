export interface Driver {
  driver_number: number;
  full_name: string;
  name_acronym: string;
  team_name: string;
  session_id: number;
}

export interface TimingData {
  driver_number: number;
  lap_number: number;
  sector_1_time?: number;
  sector_2_time?: number;
  sector_3_time?: number;
  lap_time?: number;
  gap_to_leader?: number;
  session_id: number;
  timestamp: number;
}

export interface Session {
  session_id: number;
  session_name: string;
  session_type: string;
  status: string;
  date: string;
  year: number;
  circuit_key: string;
  circuit_short_name: string;
}

export interface LapTimingStatus {
  lapNumber: number;
  driver1: {
    sector1Visible: boolean;
    sector2Visible: boolean;
    sector3Visible: boolean;
  };
  driver2: {
    sector1Visible: boolean;
    sector2Visible: boolean;
    sector3Visible: boolean;
  };
}

export interface IntervalData {
  date: string;
  driver_number: number;
  gap_to_leader: number;
  interval: number;
  meeting_key: number;
  session_key: number;
}

export interface TeamRadio {
  date: string;
  driver_number: number;
  meeting_key: number;
  recording_url: string;
  session_key: number;
  race_time: number;
}

export interface PositionData {
  date: string;
  driver_number: number;
  meeting_key: number;
  position: number;
  session_key: number;
}

export interface CarData {
  brake: number;
  date: string;
  driver_number: number;
  drs: number;
  meeting_key: number;
  n_gear: number;
  rpm: number;
  session_key: number;
  speed: number;
  throttle: number;
} 