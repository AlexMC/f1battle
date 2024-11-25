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

async function main() {
  const endpoint = process.argv[2];
  if (!endpoint) {
    console.error('Please specify an endpoint to scrape (e.g., drivers)');
    process.exit(1);
  }

  try {
    const sessions = await apiQueue.enqueue<any[]>(`${API_BASE_URL}/sessions?year=2024`);
    
    for (const session of sessions) {
      console.log(`Processing session ${session.session_key}`);
      if (endpoint === 'drivers') {
        await scrapeDriversData(session.session_key);
      }
      // Add other endpoints here as needed
    }
  } finally {
    await pool.end();
  }
}

main(); 