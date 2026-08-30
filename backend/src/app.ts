/**
 * Express App Factory
 *
 * Exports the configured Express app WITHOUT calling app.listen() or
 * connecting to the database.  This allows integration tests to import the
 * app, connect to a test database, and use supertest — without the side
 * effects of the production server startup sequence.
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import env from './config/env';
import { isDatabaseConnected } from './config/database';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import expoRoutes from './routes/expo.routes';
import applicationRoutes from './routes/application.routes';
import ticketRoutes from './routes/ticket.routes';
import uploadRoutes from './routes/upload.routes';
import errorHandler, { notFoundHandler } from './middleware/error.middleware';

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
const corsOptions = {
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/expos', expoRoutes);
app.use('/api/organizer', expoRoutes);
app.use('/api/expos', applicationRoutes);
app.use('/api/exhibitor', applicationRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/expos', ticketRoutes);
app.use('/api/upload', uploadRoutes);

// ── Utility endpoints ─────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'EventSphere Backend API is running',
    database: isDatabaseConnected() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'EventSphere Backend API',
    version: '1.0.0',
  });
});

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
