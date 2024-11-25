ALTER TABLE drivers ADD COLUMN broadcast_name VARCHAR(255);
ALTER TABLE drivers ADD COLUMN country_code VARCHAR(3);
ALTER TABLE drivers ADD COLUMN first_name VARCHAR(255);
ALTER TABLE drivers ADD COLUMN last_name VARCHAR(255);
ALTER TABLE drivers ADD COLUMN headshot_url TEXT;
ALTER TABLE drivers ADD COLUMN name_acronym VARCHAR(3);
ALTER TABLE drivers ADD COLUMN meeting_key INTEGER;
ALTER TABLE drivers ADD COLUMN team_colour VARCHAR(6);

-- Rename existing columns to match new schema
ALTER TABLE drivers RENAME COLUMN driver_name TO full_name;
