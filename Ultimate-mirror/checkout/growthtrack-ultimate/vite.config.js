import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: '/Ultimate/',
  plugins: [react()],
  test: {
    // Vitest configuration
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/utils/**'],
    },
  },
});
