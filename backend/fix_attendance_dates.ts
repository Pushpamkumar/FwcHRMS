import { pgPool } from './src/config/db';

async function main() {
  // Fix records where date was stored as previous UTC day but check_in time shows it's today IST
  // e.g. date = 2026-06-06 but check_in = 2026-06-07T... (IST morning = UTC same day)
  const result = await pgPool.query(`
    UPDATE attendance
    SET date = (check_in AT TIME ZONE 'Asia/Kolkata')::date
    WHERE date != (check_in AT TIME ZONE 'Asia/Kolkata')::date
      AND check_in IS NOT NULL
    RETURNING id, employee_id, date::text as date, check_in, status
  `);
  
  console.log(`Fixed ${result.rowCount} attendance records:`);
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit(0);
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
