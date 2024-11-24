CREATE TABLE IF NOT EXISTS team_radio (
  session_id INTEGER,
  driver_number INTEGER,
  recording_url TEXT,
  timestamp TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (session_id, driver_number, timestamp)
);
