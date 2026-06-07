import { pgPool } from './config/db';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  try {
    console.log('Creating tasks table in PostgreSQL...');
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id     VARCHAR(20) NOT NULL,
        assigned_by     VARCHAR(20) NOT NULL,
        text            VARCHAR(500) NOT NULL,
        completed       BOOLEAN DEFAULT FALSE,
        status          VARCHAR(20) DEFAULT 'review',
        due_date        DATE,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('Success! Table tasks created.');
    process.exit(0);
  } catch (err) {
    console.error('Error creating tasks table:', err);
    process.exit(1);
  }
};

run();
