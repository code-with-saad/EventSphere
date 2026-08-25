import express, { Request, Response } from 'express';
import cors from 'cors';
import env from './config/env';
import { connectDatabase, isDatabaseConnected } from './config/database';
import UserModel from './models/User.model';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import errorHandler, { notFoundHandler } from './middleware/error.middleware';

const app = express();
const PORT = env.PORT;

// CORS Configuration
// Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6
const corsOptions = {
  origin: env.FRONTEND_URL, // Allow requests from frontend origin (Req 23.1, 23.5)
  credentials: true, // Allow credentials (cookies, authorization headers) (Req 23.2)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'], // Allowed request headers (Req 23.3, 23.4)
  optionsSuccessStatus: 200 // Legacy browser support
};

// Apply CORS middleware before routes (Req 23.6)
app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'EventSphere Backend API is running',
    database: isDatabaseConnected() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'EventSphere Backend API',
    version: '1.0.0',
    documentation: '/health',
  });
});

// 404 handler for undefined routes (must be after all route definitions)
app.use(notFoundHandler);

// Global error handler (must be the last middleware)
app.use(errorHandler);

/**
 * Initialize and start the server
 * 
 * Requirements:
 * - 2.2: Verify database connection before accepting requests
 * - 2.3: Terminate startup process if connection fails
 */
async function startServer() {
  try {
    // Confirm env variables are loaded (useful for diagnosing .env issues)
    console.log('DEV_OTP_BYPASS env value:', process.env.DEV_OTP_BYPASS);

    // Connect to database first (will exit process if it fails)
    await connectDatabase();

    // Initialize database indexes
    console.log('Initializing database indexes...');
    await UserModel.createIndexes();

    // Only start accepting requests after successful database connection
    app.listen(PORT, () => {
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ Health check available at http://localhost:${PORT}/health`);
      console.log('✓ Server is ready to accept requests');
    });
  } catch (error) {
    // This catch block is redundant as connectDatabase() calls process.exit(1)
    // but kept for completeness
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
