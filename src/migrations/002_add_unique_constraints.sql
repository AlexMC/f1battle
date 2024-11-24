-- Add unique constraints for all tables
-- Sessions already has primary key from initial schema

ALTER TABLE timing_data 
ADD CONSTRAINT timing_data_unique UNIQUE (session_id, driver_number, lap_number);

ALTER TABLE position_data 
ADD CONSTRAINT position_data_unique UNIQUE (session_id, driver_number, timestamp);

ALTER TABLE car_data 
ADD CONSTRAINT car_data_unique UNIQUE (session_id, driver_number, timestamp);

ALTER TABLE location_data 
ADD CONSTRAINT location_data_unique UNIQUE (session_id, driver_number, timestamp);
