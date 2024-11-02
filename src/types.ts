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