/**
 * Global vitest setup file — runs in every worker BEFORE any test file is imported.
 *
 * Loads .env.test with override:true so test env values take priority over
 * any .env values that dotenv.config() (called inside env.ts) would otherwise set.
 *
 * This ensures every worker uses the test JWT_SECRET, MONGODB_URI, etc.
 */
import { config } from 'dotenv';
import path from 'path';

// Resolve paths relative to the backend root
const root = path.resolve(__dirname, '../../');

// 1. Load baseline .env
config({ path: path.join(root, '.env') });

// 2. Override with .env.test — test values take priority
config({ path: path.join(root, '.env.test'), override: true });
