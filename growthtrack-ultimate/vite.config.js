import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  base: '/Ultimate/',
  plugins: [react()],
  build: {
    // Raise chunk warning to 800KB to suppress Three.js/Postprocessing false positives
    // but still catch genuinely oversized chunks
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Ensure every chunk gets a unique content hash — prevents stale chunks on GitHub Pages
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Manually split Three.js out of the main bundle for better caching
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
            return 'three-vendor';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
            return 'charts-vendor';
          }
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        },
      },
    },
  },
  test: {
    // Vitest configuration
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      // setup.js is a global setup file, not a test suite
      'src/__tests__/setup.js',
    ],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/utils/**'],
    },
  },
});
