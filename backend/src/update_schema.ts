import { pgPool } from './config/db';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  try {
    console.log('Altering leave_balances table to update remaining_days generation expression...');
    await pgPool.query(`
      ALTER TABLE leave_balances DROP COLUMN IF EXISTS remaining_days;
      ALTER TABLE leave_balances ADD COLUMN remaining_days DECIMAL(5,2) GENERATED ALWAYS AS (total_days - used_days) STORED;
    `);
    console.log('Success! Table leave_balances updated.');
    process.exit(0);
  } catch (err) {
    console.error('Error updating schema:', err);
    process.exit(1);
  }
};

run();
