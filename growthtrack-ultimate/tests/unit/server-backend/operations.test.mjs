import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { loadServerConfig } from '../../../server/config.js';
import { registerOperationsRoutes } from '../../../server/domains/operations.js';
import { registerIntegrationRoutes } from '../../../server/domains/integrations.js';

test('extracted operational and integration routes preserve health, access controls and one-use handoffs', async t => {
  const config = loadServerConfig({ HANDOFF_SECRET: 'b'.repeat(64), APP_URL: 'http://localhost:5000/Ultimate/' });
  const app = express(); app.use(express.json());
  const authenticate = (req, res, next) => {
    if (req.headers['x-fixture-owner'] !== 'yes') return res.sendStatus(401);
    req.user = { id: 'fixture-owner', email: 'owner@example.test', fullName: 'Fixture Owner' }; next();
  };
  const backupStatus = { enabled: false, status: 'disabled' };
  registerOperationsRoutes(app, { prisma: { $queryRawUnsafe: async () => [{ '1': 1 }] }, config, backupScheduler: { status: () => backupStatus }, authMiddleware: authenticate, root: fileURLToPath(new URL('../../../', import.meta.url)), version: 'fixture' });
  registerIntegrationRoutes(app, { config, authMiddleware: authenticate, logToFile: () => {} });
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { 'x-fixture-owner': 'yes', 'Content-Type': 'application/json' };
  const health = await (await fetch(base + '/api/health')).json();
  assert.equal(health.status, 'online'); assert.deepEqual(health.backups, backupStatus);
  backupStatus.status = 'error';
  assert.equal((await (await fetch(base + '/api/health')).json()).status, 'degraded');
  backupStatus.status = 'disabled';
  const html = await fetch(base + '/health', { headers: { Accept: 'text/html' } });
  assert.match(html.headers.get('content-security-policy'), /'sha256-/);
  assert.match(await html.text(), /GrowthTrack/);
  for (const route of ['/api/docs', '/docs', '/api-explorer.html']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200); assert.match(response.headers.get('content-security-policy'), /script-src-attr 'none'/);
  }
  assert.equal((await fetch(base + '/api/operations/backups')).status, 401);
  assert.equal((await fetch(base + '/api/operations/backups', { method: 'POST', headers })).status, 409);
  assert.equal((await fetch(base + '/api/integrations/handoff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  const handoff = await fetch(base + '/api/integrations/handoff', { method: 'POST', headers, body: JSON.stringify({ productId: 'finsync' }) });
  assert.equal(handoff.status, 200); const { token, launchUrl } = await handoff.json();
  assert.match(launchUrl, /ultimate_handoff=/);
  const consume = body => fetch(base + '/api/integrations/consume', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  assert.equal((await consume({ productId: 'oxfin', token })).status, 401);
  const response = await consume({ productId: 'finsync', token });
  assert.equal(response.status, 200); assert.equal((await response.json()).user.id, 'fixture-owner');
  assert.equal((await consume({ productId: 'finsync', token })).status, 401);
});
