import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import express from 'express';
import { migratedFixture } from './fixture.mjs';
import { createSecurity } from '../../../server/security.js';
import { loadServerConfig } from '../../../server/config.js';
import { registerNotesRoutes } from '../../../server/domains/notes.js';

test('authenticated notes workload preserves owner isolation, CSRF and session revocation', { timeout: 240000 }, async t => {
  const { prisma } = await migratedFixture(t);
  const security = createSecurity({ prisma, config: loadServerConfig({}), logToFile: () => {}, writeEvent: async () => {} });
  const app = express(); app.use(express.json()); app.use(security.headers);
  app.post('/api/auth/logout', security.authenticate, security.logout);
  const notes = registerNotesRoutes(app, { prisma, authMiddleware: security.authenticate, enabled: true });
  for (const owner of ['owner-a', 'owner-b']) {
    await notes.create(owner, { id: `${owner}-note`, mutationId: `seed-${owner}`, title: `${owner} private`, content: 'Fictional load fixture' });
    await prisma.authSession.create({ data: { userId: owner, tokenHash: createHash('sha256').update(`fixture-${owner}`).digest('hex'), csrfHash: createHash('sha256').update('fixture-csrf').digest('hex'), expiresAt: new Date(Date.now() + 3600000) } });
  }
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, owner, options = {}) => fetch(base + path, { ...options, headers: { ...(owner ? { Cookie: `growthtrack_session=fixture-${owner}` } : {}), ...options.headers }, signal: AbortSignal.timeout(10000) });
  const route = '/api/v1/workspace/notes';
  assert.equal((await request(route)).status, 401);
  assert.equal((await request(route, 'invalid')).status, 401);
  assert.equal((await request(`${route}/owner-b-note`, 'owner-a')).status, 404);
  assert.equal((await request(route, 'owner-a', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
  const endurance = process.env.API_LOAD_ENDURANCE === '1';
  const concurrency = endurance ? 16 : 8, count = endurance ? 20000 : 240;
  const durationMs = endurance ? 60000 : 0;
  const started = performance.now(), latencies = [];
  let next = 0, failures = 0;
  const workers = await Promise.allSettled(Array.from({ length: concurrency }, async () => {
    while (next < count || (endurance && performance.now() - started < durationMs)) {
      const index = next++, owner = index % 2 ? 'owner-a' : 'owner-b';
      const start = performance.now();
      try {
        const response = await request(`${route}/${owner}-note`, owner);
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.id, `${owner}-note`);
        assert.equal(body.title, `${owner} private`);
        latencies.push(performance.now() - start);
      } catch (error) { failures++; throw error; }
    }
  }));
  latencies.sort((a, b) => a - b);
  const report = { scope: 'Real notes routes and session middleware; migrated disposable SQLite, synthetic sessions; no production capacity claim', concurrency, completed: latencies.length, failures, durationMs: performance.now() - started, p95Ms: latencies[Math.ceil(latencies.length * .95) - 1] };
  const directory = new URL('../../../../.gstack/benchmark-reports/', import.meta.url);
  await mkdir(directory, { recursive: true });
  await writeFile(new URL(endurance ? 'authenticated-api-endurance.json' : 'authenticated-api-load.json', directory), JSON.stringify(report, null, 2));
  const failed = workers.find(worker => worker.status === 'rejected');
  if (failed) throw failed.reason;
  assert.equal(failures, 0); assert(latencies.length >= count);
  assert(report.p95Ms < 2000, `API p95 ${report.p95Ms}ms exceeds 2s`);
  const logout = await request('/api/auth/logout', 'owner-a', { method: 'POST', headers: { 'X-CSRF-Token': 'fixture-csrf' } });
  assert.equal(logout.status, 200);
  assert.equal((await request(route, 'owner-a')).status, 401);
  assert.equal((await request(`${route}/owner-b-note`, 'owner-b')).status, 200);
  console.log(JSON.stringify(report));
});
