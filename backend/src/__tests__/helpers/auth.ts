/**
 * Auth Test Helpers
 *
 * Utility functions used across integration test files to:
 *  - Create test users in the database
 *  - Generate valid JWT tokens for use in Authorization headers
 *  - Perform a full login and return tokens
 */
import crypto from 'crypto';
import { ObjectId } from 'mongodb';
import request from 'supertest';
import type { Express } from 'express';
import { hashPassword } from '../../utils/password.utils';
import { generateAccessToken, generateRefreshToken } from '../../services/token.service';
import { createRefreshToken } from '../../models/RefreshToken.model';
import { getTestDb } from './db';
import type { UserRole, UserStatus, IUser } from '../../models/User.model';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TestUserOptions {
  email?: string;
  password?: string;
  fullName?: string;
  role?: UserRole;
  status?: UserStatus;
  isEmailVerified?: boolean;
}

export interface CreatedTestUser {
  _id: ObjectId;
  email: string;
  password: string; // plaintext, for login tests
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
}

export interface LoginTokens {
  accessToken: string;
  refreshToken: string;
}

// ── Counters (keep emails unique across a test run) ───────────────────────────

let counter = 0;
// Random hex suffix generated once per process — guarantees uniqueness
// across workers and sequential test file runs even when counter resets.
const RUN_ID = Math.random().toString(36).slice(2, 8);

function nextCounter(): number {
  return ++counter;
}

// ── Core helpers ──────────────────────────────────────────────────────────────

/**
 * Insert a user document directly into the test database.
 * Returns the inserted user plus the plaintext password.
 */
export async function createTestUser(opts: TestUserOptions = {}): Promise<CreatedTestUser> {
  const db = getTestDb();
  const n = nextCounter();

  const role: UserRole = opts.role ?? 'exhibitor';
  const password = opts.password ?? 'TestPassword123';
  const email = (opts.email ?? `testuser${n}-${RUN_ID}@example.com`).toLowerCase();

  // Determine sensible defaults based on role
  let defaultStatus: UserStatus = 'active';
  let defaultIsEmailVerified = true;

  if (role === 'organizer') {
    defaultStatus = 'pending';
    defaultIsEmailVerified = false;
  } else if (role === 'superadmin') {
    defaultStatus = 'active';
    defaultIsEmailVerified = true;
  }

  const status: UserStatus = opts.status ?? defaultStatus;
  const isEmailVerified: boolean = opts.isEmailVerified ?? defaultIsEmailVerified;

  const passwordHash = await hashPassword(password);
  const now = new Date();

  const doc: Omit<IUser, '_id'> = {
    email,
    passwordHash,
    fullName: opts.fullName ?? `Test User ${n}`,
    role,
    status,
    isEmailVerified,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection<IUser>('users').insertOne(doc as IUser);

  return {
    _id: result.insertedId,
    email,
    password,
    role,
    status,
    isEmailVerified,
  };
}

/**
 * Generate a valid access token for the given user — without hitting the API.
 */
export function generateTestAccessToken(user: {
  _id: ObjectId;
  email: string;
  role: UserRole;
}): string {
  return generateAccessToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  });
}

/**
 * Generate a valid refresh token and persist its hash in the database —
 * mirroring exactly what the login endpoint does.
 */
export async function generateTestRefreshToken(user: {
  _id: ObjectId;
}): Promise<string> {
  const refreshToken = generateRefreshToken({
    userId: user._id.toString(),
    type: 'refresh',
  });

  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await createRefreshToken(user._id, hash, expiresAt);

  return refreshToken;
}

/**
 * Perform a full POST /api/auth/login via supertest and return the token pair.
 * Throws if the login fails.
 */
export async function loginUser(
  app: Express,
  email: string,
  password: string
): Promise<LoginTokens> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  if (res.status !== 200) {
    throw new Error(
      `loginUser: expected 200 but got ${res.status}. Body: ${JSON.stringify(res.body)}`
    );
  }

  return {
    accessToken: res.body.data.accessToken,
    refreshToken: res.body.data.refreshToken,
  };
}

/**
 * Shortcut: create an active, verified user and log them in.
 */
export async function createAndLoginUser(
  app: Express,
  opts: TestUserOptions = {}
): Promise<{ user: CreatedTestUser; tokens: LoginTokens }> {
  // Ensure the user can actually log in
  const mergedOpts: TestUserOptions = {
    isEmailVerified: true,
    status: 'active',
    ...opts,
  };

  const user = await createTestUser(mergedOpts);
  const tokens = await loginUser(app, user.email, user.password);

  return { user, tokens };
}
