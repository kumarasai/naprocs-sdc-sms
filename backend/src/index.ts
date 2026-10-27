import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config/env';
import { connectDB } from './config/db';
import { setupSocketIO } from './sockets/attendanceSocket';
import apiRoutes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const server = http.createServer(app);

// Essential behind reverse proxies (Render, Railway, Heroku, Cloudflare, AWS)
// Ensures correct client IP detection for rate limiter and campus Wi-Fi check-in
app.set('trust proxy', 1);

// Normalize and validate allowed CORS origins
const normalizeOrigin = (url?: string) => (url ? url.trim().replace(/\/+$/, '') : '');
const configuredFrontend = normalizeOrigin(config.frontendUrl);

const isOriginAllowed = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void
) => {
  // Allow non-browser requests (Postman, mobile, curl)
  if (!origin) return callback(null, true);

  const cleanOrigin = normalizeOrigin(origin);

  // Allow configured production frontend
  if (configuredFrontend && cleanOrigin === configuredFrontend) {
    return callback(null, true);
  }

  // Allow local development ports
  const localOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ];
  if (localOrigins.includes(cleanOrigin)) {
    return callback(null, true);
  }

  // Allow Vercel preview and production deployments
  if (/\.vercel\.app$/.test(cleanOrigin)) {
    return callback(null, true);
  }

  // Permissive fallback in development
  if (config.nodeEnv !== 'production' || config.frontendUrl === '*') {
    return callback(null, true);
  }

  return callback(new Error(`CORS blocked for origin: ${origin}`));
};

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: isOriginAllowed,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
});

setupSocketIO(io);

// Security & Standard Middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin: isOriginAllowed,
    credentials: true,
  })
);

// High-performance gzip/deflate response compression
app.use(compression());

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(config.cookieSecret));

// Mount REST API
app.use(config.apiPrefix, apiRoutes);

// Root Welcome Route
app.get('/', (req, res) => {
  res.json({
    portal: 'Naprocs Skill Development Center LMS & Attendance Portal',
    version: '1.0.0',
    apiDocumentation: `${config.apiPrefix}/health`,
  });
});

import { syncSingleTrainerAndStudents } from './utils/trainerSync';

// Centralized error handling
app.use(errorHandler);

// Start server
async function startServer() {
  await connectDB();
  await syncSingleTrainerAndStudents();
  server.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(`  🚀 Naprocs LMS Backend Server running on port ${config.port}`);
    console.log(`  🌐 REST API: http://localhost:${config.port}${config.apiPrefix}`);
    console.log(`  🔌 Real-time Socket.IO: ws://localhost:${config.port}`);
    console.log(`=======================================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});

export { app, server };
