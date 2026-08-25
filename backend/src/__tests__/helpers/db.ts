/**
 * Test Database Helpers
 *
 * Manages the MongoDB connection for integration tests by calling the real
 * connectDatabase() from database.ts (with process.exit mocked away).
 * This ensures UserModel, OTPModel, RefreshTokenModel and every route handler
 * all share the SAME Db instance — the test database.
 *
 * The MONGODB_URI env var must already point at a test database before this
 * module is imported. The vitest setupFiles (setup.ts) and vitest.config.ts
 * take care of that by loading .env.test with override:true.
 */
import { Db } from 'mongodb';
import { connectDatabase, getDatabase, closeDatabase, isDatabaseConnected } from '../../config/database';

/**
 * Connect to the test database.
 *
 * Idempotent — if the database is already connected (from a previous test
 * file in the same sequential run), this is a no-op.  This prevents the
 * singleton UserModel (and other models) from caching a stale Collection
 * reference after the connection is closed and reopened.
 */
export async function connectTestDatabase(): Promise<Db> {
  if (isDatabaseConnected()) {
    return getDatabase();
  }

  // Stub process.exit so a connection failure throws rather than exits.
  const originalExit = process.exit.bind(process);
  (process as any).exit = (code?: number) => {
    throw new Error(`process.exit unexpectedly called with "${code}"`);
  };

  try {
    await connectDatabase();
  } finally {
    process.exit = originalExit;
  }

  return getDatabase();
}

/**
 * Drop all documents from the collections used by integration tests.
 * Called in beforeEach to guarantee test isolation.
 */
export async function clearCollections(): Promise<void> {
  const db = getDatabase();
  const collectionsToClear = ['users', 'otps', 'refresh_tokens'];

  await Promise.all(
    collectionsToClear.map(async (name) => {
      try {
        await db.collection(name).deleteMany({});
      } catch {
        // Collection may not exist yet — that's fine
      }
    })
  );
}

/**
 * Disconnect from the test database after all tests complete.
 *
 * With sequential file execution (fileParallelism: false), each test file
 * calls this in its afterAll.  We intentionally keep the connection alive
 * across files so the singleton UserModel (and other models) do not end up
 * with stale Collection references after a close/reopen cycle.
 *
 * The connection is closed automatically when the vitest process exits.
 */
export async function disconnectTestDatabase(): Promise<void> {
  // Intentional no-op during a test run.
  // The process-exit handler (or OS) cleans up the MongoClient.
}

/**
 * Return the active test Db instance (delegates to getDatabase()).
 */
export function getTestDb(): Db {
  return getDatabase();
}
