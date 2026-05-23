import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // Only pick up unit/integration tests — never Playwright e2e specs
    include: [
      'src/**/*.test.{js,jsx,ts,tsx}',
      'src/**/__tests__/**/*.{js,jsx,ts,tsx}',
      'tests/unit/**/*.test.{js,jsx,ts,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/e2e/**',          // Playwright specs — run via `npx playwright test`
      '**/*.spec.ts',          // Playwright convention: *.spec.ts files
      '**/*.spec.tsx',
    ],
  },
});
