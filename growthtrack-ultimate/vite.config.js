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
    strictPort: true,
    host: env.VITE_HOST || '127.0.0.1',
    allowedHosts,
    proxy: {
      '/api': {
        // Standalone `npm run dev` starts server.js on 3001. A workspace that
        // also starts the multi-product gateway can opt in with GATEWAY_URL.
        // Keeping the direct server as the default prevents login and every
        // persisted module from silently receiving 502s in normal local use.
        target: env.GATEWAY_URL || env.ULTIMATE_API_URL || 'http://127.0.0.1:3001',
        changeOrigin: false,
      },
      '/auth': {
        // Auth routes stay direct to the Ultimate server (3001) so login
        // cookies, CSRF tokens, and logout all share the same origin without
        // a gateway intermediary that could alter the Set-Cookie header.
        target: env.ULTIMATE_API_URL || 'http://127.0.0.1:3001',
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
