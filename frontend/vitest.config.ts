import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Provide import.meta.env for modules imported during tests (e.g. api.ts)
    'import.meta.env.VITE_API_BASE_URL': '"http://localhost:5000"',
    'import.meta.env.MODE':              '"test"',
    'import.meta.env.DEV':               'false',
    'import.meta.env.PROD':              'false',
    'import.meta.env.SSR':               'false',
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    // vmThreads pool required on Node.js v24 + Windows:
    // the default 'forks' pool fails with
    // 'Cannot read properties of undefined (reading config)'
    pool: 'vmThreads',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js}',
      ],
    },
  },
});