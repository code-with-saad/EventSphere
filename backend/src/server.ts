import express, { Request, Response } from 'express';
import env from './config/env';
import { connectDatabase, isDatabaseConnected } from './config/database';

const app = express();
const PORT = env.PORT;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

/**
 * Initialize and start the server
 * 
 * Requirements:
 * - 2.2: Verify database connection before accepting requests
 * - 2.3: Terminate startup process if connection fails
 */
async function startServer() {
  try {
    // Connect to database first (will exit process if it fails)
    await connectDatabase();

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
