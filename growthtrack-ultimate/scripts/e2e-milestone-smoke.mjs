import { build, preview } from 'vite';

// A dedicated production build prevents HMR or an unrelated dev server from
// replacing a canvas during the combined 3D review. API calls stay intercepted
// by the browser fixtures; no backend or owner database is started here.
const port = Number(process.env.GROWTHTRACK_SMOKE_PORT || 5177);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid GROWTHTRACK_SMOKE_PORT.');
const outDir = '.tmp/milestone-smoke-dist';
const shutdownToken = process.env.GROWTHTRACK_SMOKE_TOKEN;
if (!shutdownToken) throw new Error('Start this preview through playwright.milestone-review.config.ts.');
// Use Vite in this process so Windows teardown cannot orphan a spawned preview
// child holding the runner's output pipes open after every test has passed.
await build({ base: '/', build: { outDir }, logLevel: 'warn' });
const server = await preview({ base: '/', build: { outDir },
  preview: { host: '127.0.0.1', port, strictPort: true }, logLevel: 'warn',
  plugins: [{ name: 'milestone-preview-shutdown', configurePreviewServer(previewServer) {
    previewServer.middlewares.use((request, response, next) => {
      if (request.url !== '/__milestone-smoke/shutdown') return next();
      if (request.method !== 'POST' || request.headers['x-smoke-token'] !== shutdownToken) {
        response.writeHead(403); response.end(); return;
      }
      response.writeHead(204); response.end(() => setImmediate(close));
    });
  } }],
});
function close() {
  server.httpServer.close(() => process.exit(0));
  server.httpServer.closeAllConnections();
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, close);
