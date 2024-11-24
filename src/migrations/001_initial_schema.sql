-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create sessions table
CREATE TABLE sessions (
  session_id INTEGER PRIMARY KEY,
  session_name VARCHAR(255),
  session_type VARCHAR(50),
  status VARCHAR(50),
  date TIMESTAMP WITH TIME ZONE,
  year INTEGER,
  circuit_key VARCHAR(50),
  circuit_short_name VARCHAR(255)
);

-- Create drivers table
CREATE TABLE drivers (
  driver_number INTEGER,
  driver_name VARCHAR(255),
  team_name VARCHAR(255),
  session_id INTEGER REFERENCES sessions(session_id),
  PRIMARY KEY (driver_number, session_id)
);

-- Create timing_data table
CREATE TABLE timing_data (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(session_id),
  driver_number INTEGER,
  lap_number INTEGER,
  sector_1_time DECIMAL(10,3),
  sector_2_time DECIMAL(10,3),
  sector_3_time DECIMAL(10,3),
  lap_time DECIMAL(10,3),
  gap_to_leader DECIMAL(10,3),
  timestamp TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (driver_number, session_id) REFERENCES drivers(driver_number, session_id)
);

-- Create position_data table
CREATE TABLE position_data (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(session_id),
  driver_number INTEGER,
  position INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (driver_number, session_id) REFERENCES drivers(driver_number, session_id)
);

-- Create car_data table
CREATE TABLE car_data (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(session_id),
  driver_number INTEGER,
  speed FLOAT,
  throttle FLOAT,
  brake FLOAT,
  gear INTEGER,
  rpm INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (driver_number, session_id) REFERENCES drivers(driver_number, session_id)
);

-- Create location_data table
CREATE TABLE location_data (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(session_id),
  driver_number INTEGER,
  x FLOAT,
  y FLOAT,
  z FLOAT,
  timestamp TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (driver_number, session_id) REFERENCES drivers(driver_number, session_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_timing_data_session_driver ON timing_data(session_id, driver_number);
CREATE INDEX idx_position_data_session_driver ON position_data(session_id, driver_number);
CREATE INDEX idx_car_data_session_driver ON car_data(session_id, driver_number);
CREATE INDEX idx_location_data_session_driver ON location_data(session_id, driver_number);
CREATE INDEX idx_timing_data_timestamp ON timing_data(timestamp);
CREATE INDEX idx_position_data_timestamp ON position_data(timestamp);
CREATE INDEX idx_car_data_timestamp ON car_data(timestamp);
CREATE INDEX idx_location_data_timestamp ON location_data(timestamp);
