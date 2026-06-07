import fs from 'fs';
import path from 'path';
import { pgPool } from '../config/db';

export const initPostgres = async (): Promise<void> => {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    console.log(`[Postgres] Reading schema file from ${schemaPath}...`);
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('[Postgres] Applying database schema...');
    await pgPool.query(sql);
    console.log('[Postgres] Schema applied successfully.');
  } catch (err) {
    console.error('[Postgres] Error initializing schema:', err);
    throw err;
  }
};

// If run directly (e.g. npm run db:init)
if (require.main === module) {
  initPostgres()
    .then(() => {
      console.log('[Postgres] Initialization complete. Closing pool.');
      pgPool.end();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Postgres] Initialization failed:', err);
      pgPool.end();
      process.exit(1);
    });
}
