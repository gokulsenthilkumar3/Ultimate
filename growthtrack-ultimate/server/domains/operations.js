import fs from 'node:fs';
import path from 'node:path';
import { contentSecurityPolicy } from '../contentSecurityPolicy.js';
import { renderServerHealthHtml } from '../serverHealthHtml.js';

export function registerOperationsRoutes(app, { prisma, config, backupScheduler, authMiddleware, root, version, databaseUrl = 'file:./dev.db' }) {
  const PORT = config.server.port;
  const APP_URL = config.server.appUrl;
  app.get(['/api/health', '/health'], async (req, res) => {
    const t0 = performance.now();
    let dbStatus = 'CONNECTED';
    let dbLatency = 0;
    try {
      await prisma.$queryRawUnsafe('SELECT 1');
      dbLatency = Number((performance.now() - t0).toFixed(2));
    } catch {
      dbStatus = 'DISCONNECTED';
      dbLatency = -1;
    }
  
    const mem = process.memoryUsage();
    const uptimeSeconds = Math.round(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    const uptimeFormatted = `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`;
    const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024 * 10) / 10;
    const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024 * 10) / 10;
    const rssMB = Math.round(mem.rss / 1024 / 1024 * 10) / 10;
    const heapPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);
  
    const backupStatus = backupScheduler.status();
    const payload = {
      status: dbStatus === 'CONNECTED' && backupStatus.status !== 'error' ? 'online' : 'degraded',
      service: 'GrowthTrack Ultimate Core API',
      version: version,
      port: PORT,
      environment: config.env,
      nodeVersion: process.version,
      platform: `${process.platform}-${process.arch}`,
      uptimeSeconds,
      uptimeFormatted,
      memory: { heapUsedMB, heapTotalMB, rssMB, heapPercent },
      database: {
        provider: databaseUrl.startsWith('sqlserver:') ? 'Microsoft SQL Server' : 'SQLite (LibSQL)',
        ...(databaseUrl.startsWith('sqlserver:') ? {} : { file: path.basename(databaseUrl.replace(/^file:/, '')) }),
        status: dbStatus,
        latencyMs: dbLatency,
      },
      backups: backupStatus,
      subsystems: {
        auth: 'Local owner sessions and authentication routes are configured',
        bodyTwin: '3D physique and morphology routes are configured',
        metrics: 'Metric, body, vital and mood routes are configured',
        workouts: 'Session, routine and exercise routes are configured',
        finance: 'Budget, transaction and portfolio routes are configured',
        databaseBrowser: 'Owner browser is configured; separate local Studio is optional',
        apiDocs: 'Local API Explorer is available at /api/docs',
        gateway: 'Gateway is a separate optional service; see :3000/health for reachability'
      }
    };
  
    // Only a client that prefers HTML (a browser tab) gets the page; fetch()'s */* gets JSON.
    if (req.accepts(['json', 'html']) === 'html' && req.query.format !== 'json') {
      res.setHeader('content-type', 'text/html; charset=utf-8');
      const html = renderServerHealthHtml(payload, { app: APP_URL, dbStudio: config.gateway.dbStudioUrl, gateway: `${config.gateway.url}/health` });
      res.setHeader('Content-Security-Policy', contentSecurityPolicy(config, html));
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      return res.end(html);
    }
    res.json(payload);
  });
  app.get(['/api/docs', '/docs', '/api-explorer.html'], (req, res) => {
    const html = fs.readFileSync(path.join(root, 'api-explorer.html'), 'utf8');
    res.setHeader('Content-Security-Policy', contentSecurityPolicy(config, html));
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.type('html').send(html);
  });
  app.get('/api/operations/backups', authMiddleware, (req, res) => res.json(backupScheduler.status()));
  app.post('/api/operations/backups', authMiddleware, async (req, res) => {
    if (!config.backup.enabled) return res.status(409).json({ error: 'Configure encrypted scheduled backups before requesting a run.' });
    await backupScheduler.run();
    const status = backupScheduler.status();
    res.status(status.status === 'error' ? 503 : 200).json(status);
  });
  // Gateway health — probes each product and returns live readiness.
  // AppLauncher polls this every 15 s to show online/offline state in the App Hub.
  const GATEWAY_PRODUCT_REGISTRY = Object.freeze([
    { id: 'ultimate', name: 'Ultimate', healthUrl: `http://127.0.0.1:${PORT}/api/health` },
    ...config.gateway.companions.map(({ id, name, healthUrl }) => ({ id, name, healthUrl })),
  ]);
  async function probeProduct({ id, name, healthUrl }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.gateway.probeTimeoutMs);
    try {
      const res = await fetch(healthUrl, { signal: controller.signal });
      return { id, name, online: res.ok };
    } catch { return { id, name, online: false }; }
    finally { clearTimeout(timer); }
  }
  app.get('/api/gateway/health', async (req, res) => {
    try {
      const services = await Promise.all(GATEWAY_PRODUCT_REGISTRY.map(probeProduct));
      return res.json({ status: 'online', gateway: { port: PORT }, services });
    } catch (err) {
      return res.status(500).json({ status: 'error', error: err.message });
    }
  });

}
