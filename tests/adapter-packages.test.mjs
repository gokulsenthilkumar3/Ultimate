import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAdapters } from '../scripts/adapter-packages.mjs';
import { createHttpBridge } from '../growthtrack-ultimate/integrations/adapters/httpBridge.mjs';

test('all 32 optional packages retain disabled acceptance contracts', () => {
  const files = checkAdapters();
  const manifests = [...files].filter(([file]) => file.endsWith('/adapter.json'));
  assert.equal(manifests.length, 32);
  for (const [, text] of manifests) {
    const data = JSON.parse(text);
    assert.equal(data.runtimeEnabled, false);
    assert(data.acceptance.includes('Owner isolation'));
  }
});
test('bridge bounds destinations and requests without executing data operations', async () => {
  for (const baseUrl of ['http://remote.test', 'http://2130706433', 'http://127.1', 'http://0x7f000001', 'http://127.0.0.1/foo/..', 'https://user:password@service.test', 'https://service.test/path', 'https://service.test?secret=1']) assert.throws(() => createHttpBridge({ baseUrl }));
  let calls = 0;
  const bridge = createHttpBridge({ baseUrl: 'http://127.0.0.1:8080', token: 'fictional', fetchImpl: async (url, options) => {
    calls++; assert.equal(url, 'http://127.0.0.1:8080/health'); assert.equal(options.redirect, 'error');
    return Response.json({ status: 'ok', ignored: 'not returned' });
  } });
  assert.deepEqual(Object.keys(bridge), ['health']);
  assert.deepEqual(await bridge.health(), { status: 'ok' });
  assert.equal(calls, 1);
});
test('bridge rejects large/error responses without returning upstream secrets', async () => {
  for (const response of [new Response('private error details', { status: 500 }), new Response('x'.repeat(8193)), Response.json({ status: 'failed' })]) {
    await assert.rejects(createHttpBridge({ baseUrl: 'https://service.test', fetchImpl: async () => response }).health(), { message: 'Optional service health check failed.' });
  }
});

test('bridge cancels a stalled response body at its deadline', async () => {
  let cancelled = false;
  const response = new Response(new ReadableStream({ cancel() { cancelled = true; } }));
  const bridge = createHttpBridge({ baseUrl: 'http://127.0.0.1', timeoutMs: 20, fetchImpl: async () => response });
  await assert.rejects(bridge.health(), { message: 'Optional service health check failed.' });
  assert.equal(cancelled, true);
});
