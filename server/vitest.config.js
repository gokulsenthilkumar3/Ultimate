import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Run setup BEFORE any test file — sets DB_PATH=:memory: etc.
    setupFiles: ['./__tests__/setup.js'],
    include: ['__tests__/**/*.test.{js,ts}'],
    // Timeout per test — the concurrency stress test needs up to 15s
    testTimeout: 20000,
    // Run test files sequentially — SQLite in-memory is per-process,
    // parallel workers each get their own isolated DB
    pool: 'forks',
  },
});
