import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test-setup/setup.js'],
    include: ['__tests__/**/*.test.{js,ts}'],
    testTimeout: 20000,
    pool: 'forks',
    // Tell Vitest where to look for __mocks__ directories
    // By default it checks sibling of the mocked module and root
    // server/__mocks__ covers @supabase and routes/phase4a
  },
});
