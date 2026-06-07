import mongoose from 'mongoose';
import { connectMongo, pgPool } from '../config/db';
import { User } from '../models';
import { initPostgres } from './init';
import { seedDatabase } from './seed';

const autoInitialize = async () => {
  try {
    console.log('[Auto-Init] Starting database initialization check...');

    // 1. Connect Mongo
    await connectMongo();

    // 2. Run Postgres schema setup
    console.log('[Auto-Init] Checking PostgreSQL schema...');
    await initPostgres();

    // 3. Check if we need to seed MongoDB and PostgreSQL
    console.log('[Auto-Init] Checking if seeding is required...');
    const userCount = await User.countDocuments({});
    
    if (userCount === 0) {
      console.log('[Auto-Init] No users found. Seeding default data...');
      await seedDatabase();
      console.log('[Auto-Init] Seeding completed.');
    } else {
      console.log(`[Auto-Init] Found ${userCount} existing users. Skipping seeding.`);
    }

    console.log('[Auto-Init] Database check and initialization completed successfully.');
    
    // Close connections
    await mongoose.disconnect();
    await pgPool.end();
    process.exit(0);
  } catch (err) {
    console.error('[Auto-Init] Error during database initialization check:', err);
    try {
      await mongoose.disconnect();
      await pgPool.end();
    } catch {}
    process.exit(1);
  }
};

autoInitialize();
