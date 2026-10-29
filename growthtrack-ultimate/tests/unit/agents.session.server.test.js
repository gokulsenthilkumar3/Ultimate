// @vitest-environment node
import express from 'express';
import crypto from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSecurity } from '../../server/security.js';
import { createAgentsRouter } from '../../server/agents/router.js';

// Real session/CSRF middleware, with an in-memory session adapter and fake model.
// Never imports the application server, a database client, or local environment.
let server;
afterEach(async () => { if (server) await new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }); });
describe('Agents session and CSRF integration', () => {
  it('rejects absent, expired, revoked, cross-site and missing-CSRF requests before any provider call', async () => {
    const hash = text => crypto.createHash('sha256').update(text).digest('hex');
    const session = { id: 'fixture-session', user: { id: 'fixture-owner' }, csrfHash: hash('fixture-csrf'), expiresAt: new Date(Date.now() + 60_000), lastSeenAt: new Date() };
    const prisma = { authSession: { findUnique: vi.fn(async ({ where }) => where.tokenHash === hash('fixture-cookie') ? session : null), update: vi.fn() } };
    const security = createSecurity({ prisma, logToFile: vi.fn(), writeEvent: vi.fn(async () => {}) });
    const fetchImpl = vi.fn(async url => url.endsWith('/api/tags') ? Response.json({ models: [{ name: 'gemma3:1b' }] }) : Response.json({ message: { content: 'A response' }, done: true }));
    const app = express();
    app.use(security.headers);
    app.use('/api/agents', security.apiRateLimit, security.authenticate, createAgentsRouter({ provider: 'ollama', ollamaBaseUrl: 'http://fixture.invalid:11434', fetchImpl }));
    server = await new Promise(resolve => { const running = app.listen(0, '127.0.0.1', () => resolve(running)); });
    const body = JSON.stringify({ model: 'gemma3:1b', messages: [{ role: 'user', content: 'Help' }], today: '2026-10-29' });
    const headers = { 'Content-Type': 'application/json', Cookie: 'growthtrack_session=fixture-cookie', 'X-CSRF-Token': 'fixture-csrf' };
    const post = (path, overrides = headers) => fetch(`http://127.0.0.1:${server.address().port}/api/agents${path}`, { method: 'POST', headers: overrides, body });
    for (const path of ['/chat', '/plan']) {
      expect((await post(path, { 'Content-Type': 'application/json' })).status).toBe(401);
      expect((await post(path, { ...headers, 'X-CSRF-Token': '' })).status).toBe(403);
      expect((await post(path, { ...headers, 'Sec-Fetch-Site': 'cross-site' })).status).toBe(403);
      session.revokedAt = new Date();
      expect((await post(path)).status).toBe(401);
      delete session.revokedAt;
      session.expiresAt = new Date(0);
      expect((await post(path)).status).toBe(401);
      session.expiresAt = new Date(Date.now() + 60_000);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
    const accepted = await post('/chat');
    expect(accepted.status).toBe(200);
    expect(accepted.headers.get('Cache-Control')).toBe('no-store');
    expect(accepted.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(await accepted.text()).toContain('event: done');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
