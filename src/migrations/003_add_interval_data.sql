CREATE TABLE IF NOT EXISTS interval_data (
  session_id INTEGER,
  driver_number INTEGER,
  gap_to_leader DECIMAL(10,3),
  interval DECIMAL(10,3),
  timestamp TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (session_id, driver_number, timestamp)
);
