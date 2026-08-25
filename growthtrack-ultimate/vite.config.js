import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const allowedHosts = (env.VITE_ALLOWED_HOSTS || 'localhost,127.0.0.1').split(',').map(host => host.trim()).filter(Boolean);
  const sentryEnabled = Boolean(env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT);

  return {
  base: env.VITE_BASE_PATH || '/Ultimate/',
  plugins: [
    react(),
    sentryEnabled && sentryVitePlugin({
      org: env.SENTRY_ORG,
      project: env.SENTRY_PROJECT,
      authToken: env.SENTRY_AUTH_TOKEN,
    }),
  ].filter(Boolean),
  server: {
    port: Number(env.VITE_PORT || 5000),
    host: env.VITE_HOST || '127.0.0.1',
    allowedHosts,
    proxy: {
      '/api': {
        target: env.API_PROXY_TARGET || 'http://127.0.0.1:3001',
        changeOrigin: false,
      },
      '/auth': {
        target: env.API_PROXY_TARGET || 'http://127.0.0.1:3001',
        changeOrigin: false,
      },
    },
    watch: {
      // Prevent Vite from hot-reloading when SQLite writes to these files.
      // Without this, every DB transaction triggers HMR, restarts server.js,
      // and can corrupt or wipe in-flight data.
      ignored: [
        '**/*.db',
        '**/*.db-journal',
        '**/*.db-wal',
        '**/*.db-shm',
        '**/dev.db',
      ],
    },
  },
  build: {
    target: ['es2020', 'chrome90', 'edge90', 'firefox88', 'safari14'],
    sourcemap: sentryEnabled,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
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
    environment: 'jsdom',
    globals: true,
    // setup.js lives outside __tests__ so Vitest never mistakes it for a test suite
    setupFiles: ['./src/test-setup/setup.js'],
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/utils/**'],
    },
  },
  };
});
