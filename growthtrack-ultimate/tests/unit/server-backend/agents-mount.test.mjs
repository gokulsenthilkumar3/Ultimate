import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import createAgentsRouter from '../../../server/agents/router.js';

test('Agent mount requires authentication and reports absent setup without any provider request', async t => {
  const app = express();
  app.use(express.json());
  const auth = (req, res, next) => {
    if (req.headers['x-test-owner'] !== 'owner-a') return res.status(401).json({ error: 'Sign in.' });
    req.user = { id: 'owner-a' }; next();
  };
  let providerRequests = 0;
  app.use('/api/agents', auth, createAgentsRouter({ ollamaBaseUrl: '', fetchImpl: () => { providerRequests += 1; throw new Error('Unexpected provider call'); } }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}/api/agents`;
  assert.equal((await fetch(`${base}/readiness`)).status, 401);
  const readiness = await fetch(`${base}/readiness`, { headers: { 'x-test-owner': 'owner-a' } });
  assert.equal(readiness.status, 503);
  const body = await readiness.json();
  assert.equal(body.configured, false);
  assert.equal(body.ready, false);
  assert.equal(providerRequests, 0);
});
