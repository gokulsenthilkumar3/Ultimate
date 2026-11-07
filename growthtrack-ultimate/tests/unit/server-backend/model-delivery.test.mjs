import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { gzipSync, gunzipSync, brotliDecompressSync } from 'node:zlib';
import express from 'express';
import staticCompressionPlugin from '../../../build/staticCompressionPlugin.js';
import { registerFrontend } from '../../../server/frontend.js';
import { MODEL_DELIVERY_FILES } from '../../../server/modelDelivery.js';

test('known public model delivery is lossless, negotiated and bounded to the asset allowlist', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'growthtrack-model-delivery-'));
  t.after(async () => {
    const name = path.relative(os.tmpdir(), dir);
    assert.ok(name.startsWith('growthtrack-model-delivery-') && !name.includes(path.sep));
    await fs.rm(dir, { recursive: true, force: true });
  });
  const bytes = Buffer.from('synthetic model geometry '.repeat(1000));
  await fs.writeFile(path.join(dir, 'index.html'), '<title>Fixture</title>');
  for (const asset of MODEL_DELIVERY_FILES) { await fs.mkdir(path.dirname(path.join(dir, asset)), { recursive: true }); await fs.writeFile(path.join(dir, asset), bytes); }
  await fs.writeFile(path.join(dir, 'private.json.gz'), gzipSync('must not be exposed'));
  await staticCompressionPlugin().writeBundle({ dir }, {});
  for (const asset of MODEL_DELIVERY_FILES) {
    assert.deepEqual(gunzipSync(await fs.readFile(path.join(dir, asset + '.gz'))), bytes);
    assert.deepEqual(brotliDecompressSync(await fs.readFile(path.join(dir, asset + '.br'))), bytes);
  }
  const app = express(); registerFrontend(app, { distDirectory: dir, frontendBasePath: '/Ultimate/' });
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (asset, headers = {}) => new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${server.address().port}/Ultimate/${asset}`, { headers }, res => { const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, bytes: Buffer.concat(chunks) })); }).on('error', reject);
  });
  const compressed = await request(MODEL_DELIVERY_FILES[0], { 'Accept-Encoding': 'gzip' });
  assert.equal(compressed.headers['content-encoding'], 'gzip');
  assert.match(compressed.headers.vary, /Accept-Encoding/);
  assert.deepEqual(gunzipSync(compressed.bytes), bytes);
  assert.ok(compressed.bytes.length < bytes.length / 2);
  const identity = await request(MODEL_DELIVERY_FILES[0], { 'Accept-Encoding': 'identity' });
  assert.equal(identity.headers['content-encoding'], undefined); assert.deepEqual(identity.bytes, bytes);
  const privateAsset = await request('assets/%2e%2e%2fprivate.json', { 'Accept-Encoding': 'gzip' });
  assert.equal(privateAsset.status, 404);
});
