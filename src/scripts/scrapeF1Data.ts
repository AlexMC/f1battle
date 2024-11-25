// src/scripts/scrapeF1Data.ts
import pkg from 'pg';
import dotenv from 'dotenv';
import { apiQueue } from '../utils/apiQueue.js';
import { 
  ApiDriverResponse, 
  ApiPositionResponse, 
  ApiIntervalResponse 
} from '../types/api.js';

const { Pool } = pkg;
dotenv.config();

const API_BASE_URL = 'https://api.openf1.org/v1';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

const CHUNK_SIZE_MINUTES = 15;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function fetchDataInChunks(
  sessionId: number,
  driverNumber: number,
  sessionStartTime: Date,
  dataType: 'car' | 'location'
) {
  // Get timing data to determine actual session time range
  let timingData: any[] = [];
  try {
    timingData = await apiQueue.enqueue<any[]>(
      `${API_BASE_URL}/laps?session_key=${sessionId}&driver_number=${driverNumber}`
    );
  } catch (error) {
    console.log(`[Warning] No timing data available for driver ${driverNumber}`);
  }

  if (timingData.length === 0) {
    console.log(`Using small time window around session start for driver ${driverNumber}`);
    // Use a 5-minute window around session start
    const startTime = new Date(sessionStartTime);
    startTime.setMinutes(startTime.getMinutes() - 2);
    
    const endTime = new Date(sessionStartTime);
    endTime.setMinutes(endTime.getMinutes() + 3);

    try {
      const startISO = startTime.toISOString();
      const endISO = endTime.toISOString();
      const endpoint = dataType === 'car' ? 'car_data' : 'location';

      console.log(`[DNF Driver ${driverNumber}] Fetching ${dataType} data in single chunk...`);
      const data = await apiQueue.enqueue<any[]>(
        `${API_BASE_URL}/${endpoint}?session_key=${sessionId}&driver_number=${driverNumber}&date>${startISO}&date<${endISO}`
      );

      if (data.length > 0) {
        console.log(`[DNF Driver ${driverNumber}] Received ${data.length} points`);
        return data;
      }
    } catch (error) {
      console.log(`[DNF Driver ${driverNumber}] No ${dataType} data available in session start window`);
    }
    return [];
  }

  // Rest of the original function for drivers with timing data
  const sortedTimingData = [...timingData].sort((a, b) => 
    new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
  );

  // For races, use lap 2 as reference point and add bigger buffer
  const referenceLap = sortedTimingData.find(lap => lap.lap_number === 2) || sortedTimingData[0];
  const lastLap = sortedTimingData[sortedTimingData.length - 1];

  // Add buffer before reference lap and after last lap (10 minutes for races)
  const startTime = new Date(referenceLap.date_start);
  startTime.setMinutes(startTime.getMinutes() - 10);
  
  const endTime = new Date(lastLap.date_start);
  endTime.setMinutes(endTime.getMinutes() + 10);

  const durationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / (60 * 1000));

  console.log('Session time range calculated from laps:', {
    referenceLap: referenceLap.lap_number,
    start: startTime.toISOString(),
    end: endTime.toISOString(),
    durationMinutes,
    totalLaps: timingData.length
  });

  // Create chunks based on lap timing range
  const chunks: { startTime: Date; endTime: Date }[] = [];
  let currentStartTime = new Date(startTime);

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
  let firstDataPointLogged = false;
  
  for (const chunk of chunks) {
    try {
      const startISO = chunk.startTime.toISOString();
      const endISO = chunk.endTime.toISOString();
      
      const endpoint = dataType === 'car' ? 'car_data' : 'location';
      console.log(`[Chunk ${chunks.indexOf(chunk) + 1}/${chunks.length}] Fetching ${dataType} data...`);
      
      let data: any[] = [];
      let retryCount = 0;
      
      while (retryCount < MAX_RETRIES) {
        try {
          data = await apiQueue.enqueue<any[]>(
            `${API_BASE_URL}/${endpoint}?session_key=${sessionId}&driver_number=${driverNumber}&date>${startISO}&date<${endISO}`
          );

          // Log first data point if not already logged
          if (!firstDataPointLogged && data.length > 0) {
            console.log(`[${endpoint}] First data point sample:`, JSON.stringify(data[0], null, 2));
            firstDataPointLogged = true;
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

      if (data.length > 0) {
        allData = [...allData, ...data];
        console.log(`[Chunk ${chunks.indexOf(chunk) + 1}/${chunks.length}] Received ${data.length} points`);
      } else {
        console.log(`[Chunk ${chunks.indexOf(chunk) + 1}/${chunks.length}] No data received, moving to next chunk`);
      }
    } catch (error) {
      console.error(`Error processing chunk:`, error);
      break;
    }
  }

  return allData;
}

async function fetchAndStoreSession(sessionId: number) {
  const client = await pool.connect();
  let currentOperation = 'Starting transaction';

  try {
    await client.query('BEGIN');

    // 1. Session data
    currentOperation = 'Fetching session data';
    console.log(`[API Request] ${currentOperation} for session ${sessionId}`);
    const sessionData = await apiQueue.enqueue<any[]>(
      `${API_BASE_URL}/sessions?session_key=${sessionId}`
    );
    console.log(`[API Response] Session data received, length: ${sessionData.length}`);


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

    // 2. Drivers data
    currentOperation = 'Fetching drivers data';
    console.log(`[API Request] ${currentOperation} for session ${sessionId}`);
    const drivers = await apiQueue.enqueue<ApiDriverResponse[]>(
      `${API_BASE_URL}/drivers?session_key=${sessionId}`
    );
    console.log(`[API Response] Drivers data received, count: ${drivers.length}`);


    for (const driver of drivers) {
      await client.query(
        `INSERT INTO drivers (
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
          team_colour = $12`,
        [
          driver.driver_number,
          driver.full_name || 'Unknown Driver',
          driver.team_name || 'Unknown Team',
          sessionId,
          driver.broadcast_name || driver.full_name || 'Unknown Driver',
          driver.country_code || null,
          driver.first_name || null,
          driver.last_name || null,
          driver.headshot_url || null,
          driver.name_acronym || null,
          driver.meeting_key || null,
          driver.team_colour || null
        ]
      );

      // 3. Timing data
      currentOperation = `Fetching timing data for driver ${driver.driver_number}`;
      console.log(`[API Request] ${currentOperation}`);
      let timingData: any[] = [];
      try {
        timingData = await apiQueue.enqueue<any[]>(
          `${API_BASE_URL}/laps?session_key=${sessionId}&driver_number=${driver.driver_number}`
        );
        console.log(`[API Response] Timing data received, laps: ${timingData.length}`);
      } catch (error) {
        console.log(`[Warning] No timing data available for driver ${driver.driver_number}, likely DNF before completing any laps`);
        // Create a single "virtual" lap entry for DNF drivers
        timingData = [{
          lap_number: 0,
          duration_sector_1: null,
          duration_sector_2: null,
          duration_sector_3: null,
          lap_duration: null,
          gap_to_leader: null,
          date_start: sessionInfo.date_start
        }];
      }

      for (const lap of timingData) {
        await client.query(
          `INSERT INTO timing_data (
            session_id, driver_number, lap_number, sector_1_time,
            sector_2_time, sector_3_time, lap_time, gap_to_leader, timestamp
          ) VALUES ($1, $2, $3, CAST($4 AS DECIMAL(10,3)), CAST($5 AS DECIMAL(10,3)), 
            CAST($6 AS DECIMAL(10,3)), CAST($7 AS DECIMAL(10,3)), CAST($8 AS DECIMAL(10,3)), $9)
          ON CONFLICT (session_id, driver_number, lap_number) DO NOTHING`,
          [
            sessionId,
            driver.driver_number,
            Math.round(lap.lap_number),
            lap.duration_sector_1,
            lap.duration_sector_2,
            lap.duration_sector_3,
            lap.lap_duration,
            lap.gap_to_leader,
            lap.date_start
          ]
        );
      }

      // 3.5 Interval data
      currentOperation = `Fetching interval data for driver ${driver.driver_number}`;
      console.log(`[API Request] ${currentOperation}`);
      const intervalData = await apiQueue.enqueue<ApiIntervalResponse[]>(
        `${API_BASE_URL}/intervals?session_key=${sessionId}&driver_number=${driver.driver_number}`
      );
      console.log(`[API Response] Interval data received, points: ${intervalData.length}`);

      for (const interval of intervalData) {
        await client.query(
          `INSERT INTO interval_data (
            session_id, driver_number, gap_to_leader, interval, timestamp
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (session_id, driver_number, timestamp) DO NOTHING`,
          [
            sessionId,
            driver.driver_number,
            interval.gap_to_leader?.toString() ?? null,
            interval.interval?.toString() ?? null,
            interval.date
          ]
        );
      }

      // 4. Position data
      currentOperation = `Fetching position data for driver ${driver.driver_number}`;
      console.log(`[API Request] ${currentOperation}`);
      try {
        const positionData = await apiQueue.enqueue<ApiPositionResponse[]>(
          `${API_BASE_URL}/position?session_key=${sessionId}&driver_number=${driver.driver_number}`
        );
        console.log(`[API Response] Position data received, points: ${positionData.length}`);

        for (const pos of positionData) {
          await client.query(
            `INSERT INTO position_data (
              session_id, driver_number, position, timestamp
            ) VALUES ($1, $2, $3, $4)`,
            [sessionId, driver.driver_number, pos.position, pos.date]
          );
        }
      } catch (error) {
        console.log(`[Warning] No position data available for driver ${driver.driver_number}`);
      }

      // 5. Car data
      currentOperation = `Fetching car data for driver ${driver.driver_number}`;
      console.log(`[API Request] ${currentOperation} in chunks`);
      try {
        const carData = await fetchDataInChunks(
          sessionId,
          driver.driver_number,
          new Date(sessionInfo.date_start),
          'car'
        );
        console.log(`[API Response] Car data received, total points: ${carData.length}`);

        for (const data of carData) {
          await client.query(
            `INSERT INTO car_data (
              session_id, driver_number, speed, throttle, brake, 
              gear, rpm, timestamp
            ) VALUES ($1, $2, $3, $4, $5, CAST($6 AS INTEGER), $7, $8)
            ON CONFLICT (session_id, driver_number, timestamp) DO NOTHING`,
            [
              sessionId,
              driver.driver_number,
              data.speed,
              data.throttle,
              data.brake,
              parseInt(data.n_gear) || 0,
              data.rpm,
              data.date
            ]
          );
        }
      } catch (error) {
        console.log(`[Warning] No car data available for driver ${driver.driver_number}`);
      }

      // 6. Location data
      currentOperation = `Fetching location data for driver ${driver.driver_number}`;
      console.log(`[API Request] ${currentOperation} in chunks`);
      try {
        const locationData = await fetchDataInChunks(
          sessionId,
          driver.driver_number,
          new Date(sessionInfo.date_start),
          'location'
        );
        console.log(`[API Response] Location data received, total points: ${locationData.length}`);

        for (const loc of locationData) {
          await client.query(
            `INSERT INTO location_data (
              session_id, driver_number, x, y, z, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (session_id, driver_number, timestamp) DO NOTHING`,
            [
              sessionId,
              driver.driver_number,
              loc.x,
              loc.y,
              loc.z,
              loc.date
            ]
          );
        }
      } catch (error) {
        console.log(`[Warning] No location data available for driver ${driver.driver_number}`);
      }

      // 7. Team Radio data
      currentOperation = `Fetching team radio for driver ${driver.driver_number}`;
      console.log(`[API Request] ${currentOperation}`);
      const radioData = await apiQueue.enqueue<any[]>(
        `${API_BASE_URL}/team_radio?session_key=${sessionId}&driver_number=${driver.driver_number}`
      );
      console.log(`[API Response] Team radio received, messages: ${radioData.length}`);

      for (const radio of radioData) {
        await client.query(
          `INSERT INTO team_radio (
            session_id, driver_number, recording_url, timestamp
          ) VALUES ($1, $2, $3, $4)
          ON CONFLICT (session_id, driver_number, timestamp) DO NOTHING`,
          [
            sessionId,
            driver.driver_number,
            radio.recording_url,
            radio.date
          ]
        );
      }

      console.log(`[Driver ${driver.driver_number}] Completed processing\n`);
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

async function getProcessedSessions(): Promise<number[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT DISTINCT s.session_id 
      FROM sessions s
      INNER JOIN timing_data td ON s.session_id = td.session_id
      WHERE td.lap_number > 0
    `);
    return result.rows.map(row => row.session_id);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    const processedSessions = await getProcessedSessions();
    console.log('Already processed sessions:', processedSessions);

    // Fetch all 2024 sessions
    console.log('Fetching 2024 sessions list...');
    const sessions = await apiQueue.enqueue<any[]>(`${API_BASE_URL}/sessions?year=2024`);
    console.log(`Found ${sessions.length} sessions for 2024`);
    
    // Process only the first unprocessed session
    const nextSession = sessions.find(session => !processedSessions.includes(session.session_key));
    
    if (!nextSession) {
      console.log('All sessions have been processed');
      return;
    }

    console.log(`Processing session: ${nextSession.session_key} (${nextSession.session_name})`);
    await fetchAndStoreSession(nextSession.session_key);
    console.log('Session processed successfully');

  } catch (error) {
    console.error('Error during data scraping:', error);
  } finally {
    await pool.end();
  }
}

main();