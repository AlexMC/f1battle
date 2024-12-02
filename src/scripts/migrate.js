import pkg from 'pg';
import * as dotenv from 'dotenv';
import { readFile, readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const client = await pool.connect();
    console.log('Connected to database');

    // Create migrations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Read and execute migrations
    const migrationsDir = join(__dirname, '..', 'migrations');
    const files = await readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    console.log('Found migrations:', sqlFiles);

    for (const file of sqlFiles) {
      const { rows } = await client.query(
        'SELECT 1 FROM migrations WHERE name = $1',
        [file]
      );

      if (rows.length > 0) {
        console.log(`Skipping ${file} - already executed`);
        continue;
      }

      console.log(`Executing ${file}...`);
      const sql = await readFile(join(migrationsDir, file), 'utf-8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`${file} executed successfully`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error executing ${file}:`, err);
        throw err;
      }
    }

    client.release();
    await pool.end();
    console.log('All migrations completed successfully');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();