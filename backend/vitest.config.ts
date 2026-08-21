import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

// Load environment variables from .env file for tests
config();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
