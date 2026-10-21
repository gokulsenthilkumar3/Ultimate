import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import { once } from 'node:events';
import { frontendBasePath, registerFrontend } from '../../../server/frontend.js';

test('frontend base follows explicit setting, configured APP_URL path or Ultimate default', () => {
  assert.equal(frontendBasePath(), '/Ultimate/');
  assert.equal(frontendBasePath({ appUrl: 'http://localhost:3001/Ultimate' }), '/Ultimate/');
  assert.equal(frontendBasePath({ frontendBasePath: '/custom/', appUrl: 'http://localhost/Ultimate' }), '/custom/');
  assert.equal(frontendBasePath({ frontendBasePath: '/' }), '/');
  assert.throws(() => frontendBasePath({ frontendBasePath: '/api/' }));
  assert.throws(() => frontendBasePath({ frontendBasePath: '/Ultimate/../' }));
});

test('frontend mount serves assets and SPA under base, redirects root and preserves API/auth', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'growthtrack-frontend-test-'));
  await fs.mkdir(path.join(directory, 'assets'));
  await fs.writeFile(path.join(directory, 'index.html'), '<!doctype html><title>Ultimate fixture</title>');
  await fs.writeFile(path.join(directory, 'assets', 'app.js'), 'export const loaded = true;');
  const app = express();
  app.get('/api/health', (_req, res) => res.json({ status: 'online' }));
  app.get('/auth/callback', (_req, res) => res.json({ auth: true }));
  registerFrontend(app, { distDirectory: directory, appUrl: 'http://localhost/Ultimate/' });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });
    const relative = path.relative(os.tmpdir(), directory);
    if (!relative.startsWith('growthtrack-frontend-test-') || relative.includes(path.sep)) throw new Error('Unexpected test directory.');
    await fs.rm(directory, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const pathname of ['/', '/Ultimate']) {
    const redirected = await fetch(`${base}${pathname}`, { redirect: 'manual' });
    assert.equal(redirected.status, 302);
    assert.equal(redirected.headers.get('location'), '/Ultimate/');
  }
  const asset = await fetch(`${base}/Ultimate/assets/app.js`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('content-type'), /javascript/);
  assert.equal(await asset.text(), 'export const loaded = true;');
  const spa = await fetch(`${base}/Ultimate/settings/profile`);
  assert.equal(spa.status, 200);
  assert.match(await spa.text(), /Ultimate fixture/);
  for (const pathname of ['/Ultimate/assets/missing.js', '/api/missing', '/auth/missing', '/elsewhere']) assert.equal((await fetch(`${base}${pathname}`)).status, 404);
  assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { status: 'online' });
  assert.deepEqual(await (await fetch(`${base}/auth/callback`)).json(), { auth: true });
});
