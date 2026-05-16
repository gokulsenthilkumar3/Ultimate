import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./__tests__/setup.js'],
    include: ['__tests__/**/*.test.{js,ts}'],
    testTimeout: 20000,
    pool: 'forks',
  },
});
