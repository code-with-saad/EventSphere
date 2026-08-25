import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import path from 'path';

// Load .env first as baseline, then .env.test with override:true so test values win.
// This affects the MAIN process. The setupFiles entry does the same for each worker.
config({ path: path.resolve(__dirname, '.env') });
config({ path: path.resolve(__dirname, '.env.test'), override: true });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Loaded in every worker BEFORE any test files — ensures env vars are set
    // in workers too, before env.ts runs its dotenv.config() call.
    setupFiles: ['./src/__tests__/setup.ts'],
    // Match both unit tests and integration tests
    include: ['src/**/*.test.ts', 'src/__tests__/**/*.test.ts'],
    // Generous timeout for integration tests hitting a real database
    testTimeout: 30000,
    hookTimeout: 30000,
    // Run test files sequentially (one at a time, single worker).
    // Integration tests share a real Atlas test database — concurrent workers
    // would race on clearCollections() and corrupt each other's data.
    fileParallelism: false,
    // Within a file, tests still run sequentially (default vitest behaviour).
    sequence: {
      concurrent: false,
    },
  },
});
