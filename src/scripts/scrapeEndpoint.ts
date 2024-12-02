import pkg from 'pg';
import dotenv from 'dotenv';
import { apiQueue } from '../utils/apiQueue.js';

const { Pool } = pkg;
dotenv.config();

const API_BASE_URL = 'https://api.openf1.org/v1';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

async function scrapeDriversData(sessionId: number) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // First, ensure session exists
    const sessionData = await apiQueue.enqueue<any[]>(
      `${API_BASE_URL}/sessions?session_key=${sessionId}`
    );
    
    if (sessionData.length > 0) {
      const sessionInfo = sessionData[0];
      await client.query(
        `INSERT INTO sessions (
          session_id, session_name, session_type, status, date, 
          year, circuit_key, circuit_short_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (session_id) DO NOTHING`,
        [
          sessionId,
          sessionInfo.session_name,
          sessionInfo.session_type,
          'completed',
          sessionInfo.date_start,
          sessionInfo.year,
          sessionInfo.circuit_key,
          sessionInfo.circuit_short_name
        ]
      );
    }

    // Then insert drivers
    const drivers = await apiQueue.enqueue<any[]>(
      `${API_BASE_URL}/drivers?session_key=${sessionId}`
    );

    for (const driver of drivers) {
      await client.query(`
        INSERT INTO drivers (
          driver_number, full_name, team_name, session_id,
          broadcast_name, country_code, first_name, last_name,
          headshot_url, name_acronym, meeting_key, team_colour
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (driver_number, session_id) 
        DO UPDATE SET
          full_name = $2,
          team_name = $3,
          broadcast_name = $5,
          country_code = $6,
          first_name = $7,
          last_name = $8,
          headshot_url = $9,
          name_acronym = $10,
          meeting_key = $11,
          team_colour = $12
      `, [
        driver.driver_number,
        driver.full_name,
        driver.team_name,
        sessionId,
        driver.broadcast_name,
        driver.country_code,
        driver.first_name,
        driver.last_name,
        driver.headshot_url,
        driver.name_acronym,
        driver.meeting_key,
        driver.team_colour
      ]);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error processing session ${sessionId}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

const CHUNK_SIZE_MINUTES = 15;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function fetchCarDataInChunks(
  sessionId: number,
  driverNumber: number,
  client: pkg.PoolClient
) {
  // Get time range from existing car data
  const timeRangeResult = await client.query(`
    SELECT 
      MIN(timestamp) as start_time,
      MAX(timestamp) as end_time
    FROM car_data 
    WHERE session_id = $1 
    AND driver_number = $2
  `, [sessionId, driverNumber]);

  let startTime: Date;
  let endTime: Date;

  if (timeRangeResult.rows[0].start_time && timeRangeResult.rows[0].end_time) {
    // Use existing data range with a buffer
    startTime = new Date(timeRangeResult.rows[0].start_time);
    endTime = new Date(timeRangeResult.rows[0].end_time);
    
    // Add 5-minute buffer on both ends
    startTime.setMinutes(startTime.getMinutes() - 5);
    endTime.setMinutes(endTime.getMinutes() + 5);
  } else {
    // Fallback to session start time with a small window
    const sessionResult = await client.query(
      'SELECT date FROM sessions WHERE session_id = $1',
      [sessionId]
    );
    startTime = new Date(sessionResult.rows[0].date);
    startTime.setMinutes(startTime.getMinutes() - 2);
    
    endTime = new Date(sessionResult.rows[0].date);
    endTime.setMinutes(endTime.getMinutes() + 3);
  }

  const durationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / (60 * 1000));
  const chunks: { startTime: Date; endTime: Date }[] = [];
  let currentStartTime = new Date(startTime);

  // Create time chunks
  for (let i = 0; i < Math.ceil(durationMinutes / CHUNK_SIZE_MINUTES); i++) {
    const chunkEndTime = new Date(currentStartTime.getTime() + CHUNK_SIZE_MINUTES * 60 * 1000);
    chunks.push({ 
      startTime: currentStartTime, 
      endTime: chunkEndTime > endTime ? endTime : chunkEndTime 
    });
    currentStartTime = chunkEndTime;
    if (currentStartTime >= endTime) break;
  }

  let allData: any[] = [];
  
  // Fetch data for each chunk
  for (const chunk of chunks) {
    let retryCount = 0;
    while (retryCount < MAX_RETRIES) {
      try {
        const startISO = chunk.startTime.toISOString();
        const endISO = chunk.endTime.toISOString();
        
        console.log(`[Chunk ${chunks.indexOf(chunk) + 1}/${chunks.length}] Fetching car data...`);
        const data = await apiQueue.enqueue<any[]>(
          `${API_BASE_URL}/car_data?session_key=${sessionId}&driver_number=${driverNumber}&date>${startISO}&date<${endISO}`
        );

        if (data.length > 0) {
          allData = [...allData, ...data];
          console.log(`[Chunk ${chunks.indexOf(chunk) + 1}/${chunks.length}] Received ${data.length} points`);
        }
        break;
      } catch (error) {
        retryCount++;
        if (retryCount < MAX_RETRIES) {
          console.log(`Retry ${retryCount}/${MAX_RETRIES} after error:`, error);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount));
        } else {
          throw error;
        }
      }
    }
  }

  return allData;
}

async function scrapeCarData(sessionId: number, field?: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get session info
    const sessionResult = await client.query(
      'SELECT session_id, date FROM sessions WHERE session_id = $1',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error(`Session ${sessionId} not found in database`);
    }

    const sessionStartTime = new Date(sessionResult.rows[0].date);

    // Get drivers for this session
    const driversResult = await client.query(
      'SELECT driver_number FROM drivers WHERE session_id = $1',
      [sessionId]
    );

    console.log(`Found ${driversResult.rows.length} drivers for session ${sessionId}`);

    // Process each driver
    for (const driver of driversResult.rows) {
      console.log(`Processing car data for driver ${driver.driver_number}`);
      
      const carData = await fetchCarDataInChunks(sessionId, driver.driver_number, client);

      console.log(`Received ${carData.length} data points`);

      for (const data of carData) {
        if (field) {
          // Update single field
          await client.query(`
            UPDATE car_data 
            SET ${field} = $1 
            WHERE session_id = $2 
            AND driver_number = $3 
            AND timestamp = $4
          `, [data[field], sessionId, driver.driver_number, data.date]);
        } else {
          // Full upsert
          await client.query(`
            INSERT INTO car_data (
              session_id, driver_number, speed, throttle, brake, 
              gear, rpm, drs, timestamp
            ) VALUES ($1, $2, $3, $4, $5, CAST($6 AS INTEGER), $7, $8, $9)
            ON CONFLICT (session_id, driver_number, timestamp) 
            DO UPDATE SET
              speed = $3,
              throttle = $4,
              brake = $5,
              gear = CAST($6 AS INTEGER),
              rpm = $7,
              drs = $8
          `, [
            sessionId,
            driver.driver_number,
            data.speed,
            data.throttle,
            data.brake,
            parseInt(data.n_gear) || 0,
            data.rpm,
            data.drs,
            data.date
          ]);
        }
      }
    }

    await client.query('COMMIT');
    console.log(`Completed car data processing for session ${sessionId}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during car data scraping:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const endpoint = process.argv[2];
  const sessionId = process.argv[3] ? parseInt(process.argv[3]) : undefined;
  const field = process.argv[4];

  if (!endpoint) {
    console.error('Please specify an endpoint to scrape (e.g., drivers, car_data)');
    process.exit(1);
  }

  try {
    if (endpoint === 'drivers') {
      const sessions = await apiQueue.enqueue<any[]>(`${API_BASE_URL}/sessions?year=2024`);
      for (const session of sessions) {
        console.log(`Processing session ${session.session_key}`);
        await scrapeDriversData(session.session_key);
      }
    } else if (endpoint === 'car_data') {
      if (!sessionId) {
        console.error('Please provide a session ID for car_data endpoint');
        process.exit(1);
      }
      await scrapeCarData(sessionId, field);
    } else {
      console.error('Unsupported endpoint:', endpoint);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

main(); 