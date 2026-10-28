import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// A separate entry, without authentication, API proxies, or a service worker.
// Only fictional fixtures are imported by this preview.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'ADMIN_DEMO_');
  return {
    plugins: [react(), {
      name: 'admin-preview-home',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/' || req.url === '/index.html') {
            res.writeHead(302, { Location: '/admin-demo.html' }); res.end();
          } else next();
        });
      },
    }],
    base: './',
    optimizeDeps: { entries: ['admin-demo.html'] },
    server: {
      host: '127.0.0.1', port: Number(env.ADMIN_DEMO_PORT || 5410), strictPort: true,
      open: false,
    },
    build: {
      outDir: 'dist-admin-demo',
      rollupOptions: { input: fileURLToPath(new URL('./admin-demo.html', import.meta.url)) },
    },
    test: {
      environment: 'jsdom', globals: true,
      // Multi-page interactions include the first Vite lazy transform on CI.
      testTimeout: 15000,
      include: ['src/admin-demo/**/*.test.{js,jsx}'],
    },
  };
});
