import { ObjectId, Collection } from 'mongodb';
import { getDatabase } from '../config/database';

/**
 * RefreshToken Model
 * 
 * Manages refresh tokens for JWT-based authentication with token rotation.
 * 
 * Requirements: 9.6, 9.7
 * - Requirement 9.6: Generate new Refresh_Token during token refresh
 * - Requirement 9.7: Invalidate old Refresh_Token when new tokens are issued
 */

/**
 * IRefreshToken Interface
 * 
 * Defines the structure of a refresh token document in MongoDB.
 */
export interface IRefreshToken {
  _id: ObjectId;
  userId: ObjectId;           // Reference to User._id
  tokenHash: string;          // SHA-256 hash of refresh token for security
  isValid: boolean;           // false when rotated or invalidated
  expiresAt: Date;            // Current time + 7 days (configurable)
  createdAt: Date;            // Timestamp of token creation
}

/**
 * Get the RefreshToken collection with proper typing
 */
export function getRefreshTokenCollection(): Collection<IRefreshToken> {
  const db = getDatabase();
  return db.collection<IRefreshToken>('refresh_tokens');
}

/**
 * Initialize RefreshToken collection with indexes
 * 
 * Creates the following indexes:
 * - userId: for efficient lookup of tokens by user
 * - tokenHash: unique index to prevent duplicate tokens
 * - expiresAt: TTL index for automatic deletion of expired tokens
 * 
 * Should be called during application startup after database connection.
 */
export async function initializeRefreshTokenCollection(): Promise<void> {
  const collection = getRefreshTokenCollection();

  try {
    // Index on userId for efficient user token lookup
    // Requirement 9.7: Support lookup of user tokens for invalidation
    await collection.createIndex(
      { userId: 1 },
      { name: 'userId_index' }
    );

    // Unique index on tokenHash to prevent duplicate tokens
    // Ensures each token hash is unique in the system
    await collection.createIndex(
      { tokenHash: 1 },
      { unique: true, name: 'tokenHash_unique_index' }
    );

    // TTL index on expiresAt for automatic deletion of expired tokens
    // MongoDB will automatically delete documents when expiresAt is reached
    // expireAfterSeconds: 0 means delete immediately when the date passes
    await collection.createIndex(
      { expiresAt: 1 },
      { expireAfterSeconds: 0, name: 'expiresAt_ttl_index' }
    );

    console.log('✓ RefreshToken indexes created successfully');
  } catch (error) {
    console.error('✗ Failed to create RefreshToken indexes:', error);
    throw error;
  }
}

/**
 * Create a new refresh token document
 * 
 * @param userId - The user's ObjectId
 * @param tokenHash - SHA-256 hash of the refresh token
 * @param expiresAt - Token expiration date
 * @returns The created refresh token document
 */
export async function createRefreshToken(
  userId: ObjectId,
  tokenHash: string,
  expiresAt: Date
): Promise<IRefreshToken> {
  const collection = getRefreshTokenCollection();

  const refreshToken: IRefreshToken = {
    _id: new ObjectId(),
    userId,
    tokenHash,
    isValid: true,
    expiresAt,
    createdAt: new Date(),
  };

  await collection.insertOne(refreshToken);
  return refreshToken;
}

/**
 * Find a refresh token by its hash
 * 
 * @param tokenHash - The SHA-256 hash of the token
 * @returns The refresh token document or null if not found
 */
export async function findRefreshTokenByHash(
  tokenHash: string
): Promise<IRefreshToken | null> {
  const collection = getRefreshTokenCollection();
  return await collection.findOne({ tokenHash });
}

/**
 * Invalidate a refresh token
 * Requirement 9.7: Invalidate old Refresh_Token when new tokens are issued
 * 
 * @param tokenHash - The SHA-256 hash of the token to invalidate
 * @returns true if token was invalidated, false if not found
 */
export async function invalidateRefreshToken(
  tokenHash: string
): Promise<boolean> {
  const collection = getRefreshTokenCollection();
  
  const result = await collection.updateOne(
    { tokenHash },
    { $set: { isValid: false } }
  );

  return result.modifiedCount > 0;
}

/**
 * Invalidate all refresh tokens for a user
 * Used during password reset to force re-authentication
 * Requirement 14.5: Invalidate all existing Refresh_Tokens when password is updated
 * 
 * @param userId - The user's ObjectId
 * @returns The number of tokens invalidated
 */
export async function invalidateAllUserRefreshTokens(
  userId: ObjectId
): Promise<number> {
  const collection = getRefreshTokenCollection();
  
  const result = await collection.updateMany(
    { userId, isValid: true },
    { $set: { isValid: false } }
  );

  return result.modifiedCount;
}

/**
 * Delete a specific refresh token
 * Optional cleanup method - TTL index handles automatic deletion
 * 
 * @param tokenHash - The SHA-256 hash of the token to delete
 * @returns true if token was deleted, false if not found
 */
export async function deleteRefreshToken(
  tokenHash: string
): Promise<boolean> {
  const collection = getRefreshTokenCollection();
  
  const result = await collection.deleteOne({ tokenHash });
  return result.deletedCount > 0;
}

/**
 * Delete all invalid or expired tokens for a user
 * Optional cleanup method for manual token cleanup
 * 
 * @param userId - The user's ObjectId
 * @returns The number of tokens deleted
 */
export async function cleanupUserRefreshTokens(
  userId: ObjectId
): Promise<number> {
  const collection = getRefreshTokenCollection();
  
  const result = await collection.deleteMany({
    userId,
    $or: [
      { isValid: false },
      { expiresAt: { $lt: new Date() } }
    ]
  });

  return result.deletedCount;
}

/**
 * Hard-delete ALL refresh tokens for a user (valid or not)
 * Used when permanently deleting a user account (e.g., rejecting an organizer)
 * Requirements: 11.5, 11.7
 *
 * @param userId - The user's ObjectId
 * @returns The number of tokens deleted
 */
export async function deleteAllUserRefreshTokensByUserId(
  userId: ObjectId
): Promise<number> {
  const collection = getRefreshTokenCollection();
  const result = await collection.deleteMany({ userId });
  return result.deletedCount;
}
