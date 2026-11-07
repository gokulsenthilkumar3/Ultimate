import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import { once } from 'node:events';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import http from 'node:http';
import { frontendBasePath, registerFrontend } from '../../../server/frontend.js';
import { loadServerConfig } from '../../../server/config.js';

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
  const bootstrap = 'window.fixtureReady = true;';
  await fs.writeFile(path.join(directory, 'index.html'), `<!doctype html><title>Ultimate fixture</title><script>${bootstrap}</script>`);
  await fs.writeFile(path.join(directory, 'assets', 'app.js'), 'export const loaded = true;');
  const script = 'export const largeFixture = ' + JSON.stringify('fixture '.repeat(1000)) + ';';
  const hashed = path.join(directory, 'assets', 'app-test1234.js');
  await fs.writeFile(hashed, script);
  await fs.writeFile(hashed + '.gz', gzipSync(script));
  await fs.writeFile(hashed + '.br', brotliCompressSync(script));
  await fs.writeFile(path.join(directory, 'assets', 'fallback-test1234.js'), script);
  const app = express();
  app.get('/api/health', (_req, res) => res.json({ status: 'online' }));
  app.get('/auth/callback', (_req, res) => res.json({ auth: true }));
  registerFrontend(app, { distDirectory: directory, appUrl: 'http://localhost/Ultimate/', securityConfig: loadServerConfig({}) });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });
    const relative = path.relative(os.tmpdir(), directory);
    if (!relative.startsWith('growthtrack-frontend-test-') || relative.includes(path.sep)) throw new Error('Unexpected test directory.');
    await fs.rm(directory, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const route of ['/Ultimate/', '/Ultimate/index.html', '/Ultimate/finance/overview']) {
    const response = await fetch(base + route, { headers: { Accept: 'text/html' } });
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('content-security-policy').includes(`'sha256-${createHash('sha256').update(bootstrap).digest('base64')}'`));
    assert.doesNotMatch(response.headers.get('content-security-policy'), /script-src [^;]*'unsafe-inline'|'unsafe-eval'/);
  }
  for (const pathname of ['/', '/Ultimate']) {
    const redirected = await fetch(`${base}${pathname}`, { redirect: 'manual' });
    assert.equal(redirected.status, 302);
    assert.equal(redirected.headers.get('location'), '/Ultimate/');
  }
  const asset = await fetch(`${base}/Ultimate/assets/app.js`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('content-type'), /javascript/);
  assert.equal(await asset.text(), 'export const loaded = true;');
  for (const encoding of ['br', 'gzip']) {
    const compressed = await fetch(`${base}/Ultimate/assets/app-test1234.js`, { headers: { 'Accept-Encoding': encoding } });
    assert.equal(compressed.status, 200);
    assert.equal(compressed.headers.get('content-encoding'), encoding);
    assert.match(compressed.headers.get('vary'), /Accept-Encoding/i);
    assert.match(compressed.headers.get('content-type'), /javascript/);
    assert.equal(await compressed.text(), script);
    assert(Number(compressed.headers.get('content-length')) < script.length / 2);
    const head = await fetch(`${base}/Ultimate/assets/app-test1234.js`, { method: 'HEAD', headers: { 'Accept-Encoding': encoding } });
    assert.equal(head.headers.get('content-encoding'), encoding);
    assert.equal(await head.text(), '');
  }
  const identity = await fetch(`${base}/Ultimate/assets/app-test1234.js`, { headers: { 'Accept-Encoding': 'identity' } });
  assert.equal(identity.headers.get('content-encoding'), null);
  assert.equal(await identity.text(), script);
  const preferred = await fetch(`${base}/Ultimate/assets/app-test1234.js`, { headers: { 'Accept-Encoding': 'br;q=0.1, gzip;q=1' } });
  assert.equal(preferred.headers.get('content-encoding'), 'gzip');
  await preferred.text();
  const partial = await fetch(`${base}/Ultimate/assets/app-test1234.js`, { headers: { Range: 'bytes=0-9', 'Accept-Encoding': 'br' } });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get('content-encoding'), null);
  assert.equal(await partial.text(), script.slice(0, 10));
  const fallback = await fetch(`${base}/Ultimate/assets/fallback-test1234.js`, { headers: { 'Accept-Encoding': 'br, gzip' } });
  assert.equal(fallback.headers.get('content-encoding'), null);
  assert.equal(await fallback.text(), script);
  // A literal Windows separator must never escape assets while negotiating a
  // precompressed response. fetch normalizes this input, so send a raw path.
  await fs.writeFile(path.join(directory, 'private-test1234.js.br'), brotliCompressSync(Buffer.from('private synthetic fixture')));
  const traversal = await new Promise((resolve, reject) => {
    const request = http.get(base, { path: '/Ultimate/assets/..\\private-test1234.js', headers: { 'Accept-Encoding': 'br' } }, response => {
      let body = ''; response.on('data', chunk => { body += chunk; }); response.on('end', () => resolve({ status: response.statusCode, body }));
    });
    request.on('error', reject);
  });
  assert.ok([400, 404].includes(traversal.status));
  assert.doesNotMatch(traversal.body, /private synthetic fixture/);
  const spa = await fetch(`${base}/Ultimate/settings/profile`);
  assert.equal(spa.status, 200);
  assert.match(await spa.text(), /Ultimate fixture/);
  for (const pathname of ['/Ultimate/assets/missing.js', '/api/missing', '/auth/missing', '/elsewhere']) assert.equal((await fetch(`${base}${pathname}`)).status, 404);
  assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { status: 'online' });
  assert.deepEqual(await (await fetch(`${base}/auth/callback`)).json(), { auth: true });
});
