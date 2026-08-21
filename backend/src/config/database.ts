import { MongoClient, Db } from 'mongodb';
import env from './env';

/**
 * Database Configuration Module
 * 
 * Handles MongoDB Atlas connection with:
 * - Connection pooling (default settings)
 * - Connection verification before server startup
 * - Graceful error handling and process termination on failure
 * - Environment variable configuration (validated via Zod)
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Connect to MongoDB Atlas
 * 
 * @throws Error if connection fails
 */
export async function connectDatabase(): Promise<void> {
  try {
    // Requirement 2.5: Source connection string from MONGODB_URI environment variable
    // (validated by env.ts using Zod schema)
    const MONGODB_URI = env.MONGODB_URI;

    console.log('Connecting to MongoDB Atlas...');

    // Requirement 2.4: Create MongoClient with connection pooling (default settings)
    // Default pool size: 100 connections
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,     // Maximum number of connections in the pool
      minPoolSize: 2,      // Minimum number of connections in the pool
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
    });

    // Requirement 2.1: Connect to MongoDB Atlas
    await client.connect();

    // Requirement 2.2: Verify the connection before accepting requests
    // Ping the admin database to verify connection
    await client.db('admin').command({ ping: 1 });

    // Get the database instance (defaults to database name in connection string)
    db = client.db();

    console.log(`✓ Successfully connected to MongoDB Atlas`);
    console.log(`✓ Database: ${db.databaseName}`);
    console.log(`✓ Connection pooling enabled`);
  } catch (error) {
    // Requirement 2.3: Log error and terminate startup process if connection fails
    console.error('✗ MongoDB connection failed:');
    if (error instanceof Error) {
      console.error(`  Error: ${error.message}`);
    } else {
      console.error(`  Error: ${error}`);
    }
    console.error('  Terminating application...');
    
    // Terminate the process with error code
    process.exit(1);
  }
}

/**
 * Get the database instance
 * 
 * @returns The MongoDB database instance
 * @throws Error if database is not connected
 */
export function getDatabase(): Db {
  if (!db) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return db;
}

/**
 * Get the MongoDB client instance
 * 
 * @returns The MongoDB client instance
 * @throws Error if client is not connected
 */
export function getClient(): MongoClient {
  if (!client) {
    throw new Error('MongoDB client not connected. Call connectDatabase() first.');
  }
  return client;
}

/**
 * Close the database connection gracefully
 * Used during application shutdown
 */
export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    console.log('✓ MongoDB connection closed');
    client = null;
    db = null;
  }
}

/**
 * Check if database is connected
 * 
 * @returns true if connected, false otherwise
 */
export function isDatabaseConnected(): boolean {
  return client !== null && db !== null;
}
