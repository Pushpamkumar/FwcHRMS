import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectMongo, connectRedis, pgPool } from './config/db';
import authRoutes from './routes/auth';
import employeeRoutes from './routes/employees';
import payrollRoutes from './routes/payroll';
import { startPayrollWorker } from './queues/payrollQueue';
import attendanceRoutes from './routes/attendance';
import leaveRoutes from './routes/leaves';
import recruitmentRoutes from './routes/recruitment';
import aiRoutes from './routes/ai';
import goalRoutes from './routes/goals';
import taskRoutes from './routes/tasks';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// CUSTOM COOKIE PARSER MIDDLEWARE
// ==========================================
app.use((req: any, res, next) => {
  const cookieHeader = req.headers.cookie;
  req.cookies = {};
  if (cookieHeader) {
    cookieHeader.split(';').forEach((cookie: string) => {
      const parts = cookie.split('=');
      const name = parts.shift()?.trim();
      if (name) {
        req.cookies[name] = decodeURIComponent(parts.join('='));
      }
    });
  }
  next();
});

// ==========================================
// STANDARD MIDDLEWARES
// ==========================================
app.use(helmet());
app.use(morgan('dev'));

// CORS configuration to allow local frontend requests with credentials on any local port
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002'
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// ROUTES
// ==========================================
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/employees', employeeRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/leaves', leaveRoutes);
app.use('/api/v1/recruitment', recruitmentRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/goals', goalRoutes);
app.use('/api/v1/tasks', taskRoutes);


// Base health endpoint
app.get('/health', async (req: Request, res: Response) => {
  let dbStatus = { mongo: 'disconnected', postgres: 'disconnected', redis: 'disconnected' };

  try {
    const mongoStatus = require('mongoose').connection.readyState;
    dbStatus.mongo = mongoStatus === 1 ? 'connected' : 'connecting/disconnected';
    
    await pgPool.query('SELECT 1');
    dbStatus.postgres = 'connected';

    const { redisClient } = require('./config/db');
    dbStatus.redis = redisClient.isOpen ? 'connected' : 'disconnected';

    return res.status(200).json({
      status: 'healthy',
      databases: dbStatus,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'unhealthy',
      error: err.message,
      databases: dbStatus,
      timestamp: new Date().toISOString()
    });
  }
});

// Global 404 Route
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} not found.` });
});

// ==========================================
// BOOTSTRAP SERVER
// ==========================================
const startServer = async () => {
  try {
    console.log('[Server] Connecting to databases...');
    await connectMongo();
    await connectRedis();
    
    // Test postgres connection
    await pgPool.query('SELECT 1');
    console.log('[Postgres] Connection test successful.');

    // Start BullMQ Worker
    startPayrollWorker();

    app.listen(PORT, () => {
      console.log(`[Server] Express API is running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Server] Critical connection failure on startup:', err);
    process.exit(1);
  }
};

startServer();
