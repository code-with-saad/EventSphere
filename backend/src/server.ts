import env from './config/env';
import { connectDatabase } from './config/database';
import UserModel from './models/User.model';
import ExpoModel from './models/Expo.model';
import ApplicationModel from './models/Application.model';
import TicketModel from './models/Ticket.model';
import SessionModel from './models/Session.model';
import BookmarkModel from './models/Bookmark.model';
import MessageModel from './models/Message.model';
import FeedbackModel from './models/Feedback.model';
import FavoriteModel from './models/Favorite.model';
import app from './app';

const PORT = env.PORT;

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
    await ExpoModel.createIndexes();
    await ApplicationModel.createIndexes();
    await TicketModel.createIndexes();
    await SessionModel.createIndexes();
    await BookmarkModel.createIndexes();
    await MessageModel.createIndexes();
    await FeedbackModel.createIndexes();
    await FavoriteModel.createIndexes();

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
