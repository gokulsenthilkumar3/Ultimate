import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import { once } from 'node:events';
import { gzipSync } from 'node:zlib';
import { registerFrontend } from '../../../server/frontend.js';

test('only anonymous hashed code is public-cacheable; private and missing responses are not', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'growthtrack-edge-cache-'));
  await fs.mkdir(path.join(directory, 'assets'));
  await fs.writeFile(path.join(directory, 'index.html'), '<!doctype html><title>Fixture</title>');
  const code = 'export const fixture = true;';
  await fs.writeFile(path.join(directory, 'assets', 'app-abcdef12.js'), code);
  await fs.writeFile(path.join(directory, 'assets', 'app-abcdef12.js.gz'), gzipSync(code));
  const app = express();
  app.use((_req, res, next) => { res.set('Cache-Control', 'private, no-cache'); next(); });
  registerFrontend(app, { distDirectory: directory });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    await new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });
    // This invocation created this unique directory; no owner files are mounted.
    await fs.rm(directory, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${server.address().port}/Ultimate/`;
  for (const encoding of ['identity', 'gzip']) {
    const publicResponse = await fetch(base + 'assets/app-abcdef12.js', { headers: { 'Accept-Encoding': encoding } });
    assert.equal(publicResponse.headers.get('cache-control'), 'public, max-age=31536000, immutable');
    await publicResponse.text();
    for (const privateHeader of [{ Cookie: 'growthtrack_session=synthetic' }, { Authorization: 'Bearer synthetic' }, { Range: 'bytes=0-3' }]) {
      const response = await fetch(base + 'assets/app-abcdef12.js', { headers: { 'Accept-Encoding': encoding, ...privateHeader } });
      assert.doesNotMatch(response.headers.get('cache-control'), /public|immutable/);
      await response.text();
    }
  }
  for (const name of ['', 'sw.js', 'assets/missing-abcdef12.js']) {
    const response = await fetch(base + name);
    assert.doesNotMatch(response.headers.get('cache-control'), /public|immutable/);
    await response.text();
  }
});
