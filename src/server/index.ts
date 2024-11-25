import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import Redis from 'ioredis';
import compression from 'compression';
import pkg from 'pg';
import dotenv from 'dotenv';

// Load environment variables before creating the pool
dotenv.config();

const { Pool } = pkg;
const app = express();
const port = 3001;

app.use(express.json({ limit: '50mb' }));
app.use(compression());
app.use(cors());

const redis = new Redis({
  host: 'localhost',
  port: 6379
});

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

interface CacheRequest {
  key: string;
  data: unknown;
  expiresIn?: number;
}

interface CacheParams {
  key: string;
}

const setCacheHandler: RequestHandler<{}, any, CacheRequest> = async (req, res): Promise<void> => {
  const { key, data, expiresIn = 3600000 } = req.body;
  try {
    const item: CacheItem<unknown> = {
      data,
      timestamp: Date.now(),
      expiresIn
    };
    await redis.set(key, JSON.stringify(item), 'PX', expiresIn);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set cache' });
  }
};

const getCacheHandler: RequestHandler<CacheParams> = async (req, res): Promise<void> => {
  try {
    const item = await redis.get(req.params.key);
    if (!item) {
      res.json({ data: null });
      return;
    }
    const parsedItem = JSON.parse(item) as CacheItem<unknown>;
    res.json({ data: parsedItem.data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cache' });
  }
};

const clearCacheHandler: RequestHandler<CacheParams> = async (req, res): Promise<void> => {
  try {
    await redis.del(req.params.key);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cache' });
  }
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Successfully connected to database');
    release();
  }
});

app.post('/cache', setCacheHandler);
app.get('/cache/:key', getCacheHandler);
app.delete('/cache/:key', clearCacheHandler);

app.get('/db/sessions', async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT * FROM sessions 
      WHERE year = 2024 
      ORDER BY date DESC
    `);
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sessions from database:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

app.get('/db/drivers/:sessionId', async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        d.driver_number,
        d.driver_name as full_name,
        d.team_name
      FROM drivers d
      WHERE d.session_id = $1
      ORDER BY d.driver_number
    `, [req.params.sessionId]);
    client.release();
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching drivers from database:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

app.get('/db/timing/:sessionId/:driverNumber', async (req: Request, res: Response) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        driver_number,
        lap_number,
        sector_1_time,
        sector_2_time,
        sector_3_time,
        lap_time,
        gap_to_leader,
        session_id,
        EXTRACT(EPOCH FROM timestamp) * 1000 as timestamp
      FROM timing_data 
      WHERE session_id = $1 
      AND driver_number = $2
      AND timestamp IS NOT NULL
      ORDER BY lap_number ASC
    `, [req.params.sessionId, req.params.driverNumber]);

    // Format timestamps and validate data
    const formattedRows = result.rows.map(row => ({
      ...row,
      timestamp: Number(row.timestamp),
      sector_1_time: row.sector_1_time ? Number(row.sector_1_time) : null,
      sector_2_time: row.sector_2_time ? Number(row.sector_2_time) : null,
      sector_3_time: row.sector_3_time ? Number(row.sector_3_time) : null,
      lap_time: row.lap_time ? Number(row.lap_time) : null,
      gap_to_leader: row.gap_to_leader ? Number(row.gap_to_leader) : null,
    }));

    client.release();
    res.json(formattedRows);
  } catch (error) {
    console.error('Error fetching timing data from database:', error);
    res.status(500).json({ error: 'Failed to fetch timing data' });
  }
});

app.listen(port, () => {
  console.log(`Cache server running on port ${port}`);
});

process.on('exit', () => {
  pool.end();
}); 