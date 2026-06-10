import mongoose from 'mongoose';
import { Pool } from 'pg';
import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// ==========================================
// 1. MONGODB CONNECTION SETUP (Mongoose)
// ==========================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fwc_hrms';

export const connectMongo = async (retries = 5, delay = 5000): Promise<typeof mongoose> => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[Mongo] Connecting to MongoDB at ${MONGODB_URI.split('@').pop()}...`);
      const conn = await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('[Mongo] Connection established successfully.');
      return conn;
    } catch (err) {
      console.error(`[Mongo] Connection attempt ${i + 1} failed:`, err);
      if (i < retries - 1) {
        console.log(`[Mongo] Retrying in ${delay / 1000}s...`);
        await new Promise((res) => setTimeout(res, delay));
      }
    }
  }
  throw new Error('[Mongo] Maximum connection retries exceeded. Exiting.');
};

// ==========================================
// 2. POSTGRESQL CONNECTION SETUP (pg Pool)
// ==========================================
export const pgPool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  database: process.env.PG_DATABASE || 'fwc_hrms',
  max: 20, // max number of clients in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pgPool.on('connect', () => {
  console.log('[Postgres] New client connected to PostgreSQL pool.');
});

pgPool.on('error', (err) => {
  console.error('[Postgres] Unexpected database pool error:', err);
});

// ==========================================
// 3. REDIS CONNECTION SETUP
// ==========================================
const REDIS_URL = process.env.REDIS_PASSWORD
  ? `redis://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
  : `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
export const redisClient = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500),
  },
  disableOfflineQueue: true,
});


redisClient.on('connect', () => {
  console.log('[Redis] Connecting client to Redis...');
});

redisClient.on('ready', () => {
  console.log('[Redis] Client connected and ready.');
});

redisClient.on('error', (err) => {
  console.error('[Redis] Client error:', err);
});

export const connectRedis = async (): Promise<void> => {
  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
    } catch (err) {
      console.error('[Redis] Failed to connect to Redis:', err);
    }
  }
};
