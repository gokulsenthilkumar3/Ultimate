import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import serviceWorkerPlugin from './build/serviceWorkerPlugin.js';
import staticCompressionPlugin from './build/staticCompressionPlugin.js';
import nativeEntriesPlugin from './scripts/nativeEntriesPlugin.js';
import kineticGraphPlugin from './scripts/kineticGraphPlugin.js';
import uiBuildInfo from './build/uiBuildInfo.js';
import { fileURLToPath } from 'node:url';

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // The workspace proxy lives at the repository root. Keep it optional so a
  // standalone/container build only needs the Ultimate application context;
  // workspace development still loads the canonical proxy when enabled.
  const createUiProxies = env.GROWTHTRACK_WORKSPACE === '1'
    ? (await import('./scripts/workspace-proxy.mjs')).createUiProxies
    : null;
  const allowedHosts = (env.VITE_ALLOWED_HOSTS || 'localhost,127.0.0.1').split(',').map(host => host.trim()).filter(Boolean);
  const sentryEnabled = Boolean(env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT);

  return {
  base: env.VITE_BASE_PATH || '/Ultimate/',
  // Trace snapshots are generated HTML, not application entry points.
  optimizeDeps: { entries: ['index.html'] },
  plugins: [
    react(),
    nativeEntriesPlugin(),
    serviceWorkerPlugin(),
    sentryEnabled && sentryVitePlugin({
      org: env.SENTRY_ORG,
      project: env.SENTRY_PROJECT,
      authToken: env.SENTRY_AUTH_TOKEN,
    }),
    staticCompressionPlugin(),
    kineticGraphPlugin(),
    uiBuildInfo(),
  ].filter(Boolean),
  server: {
    port: Number(env.VITE_PORT || 5000),
    strictPort: true,
    host: env.VITE_HOST || '127.0.0.1',
    allowedHosts,
    proxy: createUiProxies ? createUiProxies(env) : {
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
        '**/.venv/**',
        // Playwright writes HTML snapshots while recording. Watching them
        // reloads the app during the test and can interrupt model loading.
        '**/artifacts/**',
        '**/test-results/**',
        '**/playwright-report/**',
        '**/*.db',
        '**/*.db-journal',
        '**/*.db-wal',
        '**/*.db-shm',
        '**/dev.db',
      ],
    },
  },
  build: {
    manifest: true,
    target: ['es2020', 'chrome90', 'edge90', 'firefox88', 'safari14'],
    sourcemap: sentryEnabled,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      input: { main: fileURLToPath(new URL('./index.html', import.meta.url)), companion: fileURLToPath(new URL('./companion.html', import.meta.url)) },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Let the bundler follow the lazy route boundaries. Manual vendor groups
        // also captured shared React helpers, making the entry import WebGL and
        // charts before either feature was opened.
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 15_000,
    // setup.js lives outside __tests__ so Vitest never mistakes it for a test suite
    setupFiles: ['./src/test-setup/setup.js'],
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/utils/**'],
      thresholds: { statements: 50, branches: 40, functions: 50, lines: 50 },
    },
  },
  };
});
