import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import express from 'express';
import { registerStreamingRoutes, parseWatchCsv, normalizeWatchEvent } from '../../../server/domains/streaming.js';

const event = { id: 'synthetic-episode-1', title: 'A synthetic show', watchedAt: '2026-11-06T18:00:00Z' };
async function fixture(t, encryptionKey = 'ab'.repeat(32)) {
  const credentials = new Map(), records = new Map();
  const prisma = { integrationCredential: {
    findUnique: async q => credentials.get(JSON.stringify(q.where.userId_provider)) || null,
    upsert: async q => { const id = JSON.stringify(q.where.userId_provider); const row = { ...(credentials.get(id) || q.create), ...q.update }; credentials.set(id, row); return row; },
    deleteMany: async q => { credentials.delete(JSON.stringify(q.where)); return { count: 1 }; },
  }, entertainmentMedia: {
    findUnique: async q => records.get(q.where.id),
    create: async q => { records.set(q.data.id, q.data); return q.data; },
    count: async q => [...records.values()].filter(row => row.userId === q.where.userId && row.data.includes(q.where.data.contains)).length,
    findMany: async q => [...records.values()].filter(row => row.userId === q.where.userId && row.data.includes(q.where.data.contains)).slice(0, q.take),
  }, $transaction: async work => work(prisma) };
  const app = express();
  app.use('/api/integrations/streaming/:provider/webhook/:owner', express.raw({ type: 'application/json', limit: '64kb' }));
  app.use(express.json());
  const auth = (req, res, next) => { if (!['owner-one', 'owner-two'].includes(req.headers.authorization)) return res.sendStatus(401); req.user = { id: req.headers.authorization }; next(); };
  registerStreamingRoutes(app, auth, { prisma, config: { security: { encryptionKey } } });
  const server = await new Promise(resolve => { const value = app.listen(0, '127.0.0.1', () => resolve(value)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (path = '', options = {}) => fetch(`http://127.0.0.1:${server.address().port}/api/integrations/streaming${path}`, { ...options, headers: { Authorization: 'owner-one', 'Content-Type': 'application/json', ...options.headers } });
  return { request, credentials, records };
}
test('CSV handles quotes, BOM, explicit localized dates, invalid dates and limits without inventing progress', () => {
  const result = parseWatchCsv('\uFEFFTitle,Date\r\n"A, title",06/11/26', 'netflix', 'DMY');
  assert.equal(result[0].title, 'A, title'); assert.equal(result[0].watchedAt, '2026-11-06');
  assert.equal(result[0].durationMinutes, undefined); assert.equal(result[0].status, undefined); assert.equal(result[0].type, undefined);
  assert.deepEqual(result, parseWatchCsv('Title,Date\n"A, title",2026-11-06', 'netflix'));
  assert.throws(() => parseWatchCsv('Title,Date\nx,11/06/26', 'netflix'));
  assert.throws(() => parseWatchCsv('Title,Date\nx,2026-02-30', 'netflix'));
  assert.throws(() => parseWatchCsv('Title,Date\n"unterminated,2026-11-06', 'netflix'));
  assert.throws(() => parseWatchCsv('Title,Date\n' + Array(501).fill('x,2026-11-06').join('\n'), 'netflix'));
  assert.throws(() => normalizeWatchEvent({ ...event, userId: 'other-owner' }));
  assert.throws(() => normalizeWatchEvent({ ...event, durationMinutes: -1 }));
  assert.throws(() => normalizeWatchEvent({ ...event, watchedAt: '2026-11-06T18:00:00' }));
});
test('owner preview writes nothing, commit deduplicates and owners stay isolated', async t => {
  const f = await fixture(t);
  assert.equal((await f.request('', { headers: { Authorization: '' } })).status, 401);
  const csv = 'Title,Date\nSynthetic,2026-11-06';
  const body = commit => JSON.stringify({ csv, commit });
  assert.equal((await f.request('/netflix/import', { method: 'POST', body: body(false) }).then(r => r.json())).count, 1);
  assert.equal(f.records.size, 0);
  assert.deepEqual(await f.request('/netflix/import', { method: 'POST', body: body(true) }).then(r => r.json()), { imported: 1, duplicates: 0 });
  assert.deepEqual(await f.request('/netflix/import', { method: 'POST', body: body(true) }).then(r => r.json()), { imported: 0, duplicates: 1 });
  assert.equal((await f.request('/netflix/history', { headers: { Authorization: 'owner-two' } }).then(r => r.json())).count, 0);
  assert.equal((await f.request('/netflix/history').then(r => r.json())).count, 1);
  assert.equal((await f.request('/prime-video/history').then(r => r.json())).count, 0);
  assert.equal([...f.records.values()][0].progress, 'streaming-watch-event-v1');
});
test('webhooks require encrypted grants, exact raw-byte signature, recent timestamp and correct scope', async t => {
  const f = await fixture(t);
  const grant = await f.request('/netflix/connection', { method: 'POST', body: '{}' }).then(r => r.json());
  assert.equal(grant.secret.length, 64);
  const stored = [...f.credentials.values()][0];
  assert.ok(stored.accessTokenCiphertext.startsWith('gcm1:')); assert.ok(!stored.accessTokenCiphertext.includes(grant.secret));
  assert.ok(!(await f.request('').then(r => r.text())).includes(grant.secret));
  const send = (secret, path = '/netflix/webhook/owner-one', timestamp = String(Math.floor(Date.now() / 1000)), body = JSON.stringify(event)) => f.request(path, { method: 'POST', body, headers: { Authorization: '', 'X-GrowthTrack-Timestamp': timestamp, 'X-GrowthTrack-Signature': createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex') } });
  assert.equal((await send('wrong-secret')).status, 401);
  assert.equal((await send(grant.secret, '/netflix/webhook/owner-two')).status, 401);
  assert.equal((await send(grant.secret, '/prime-video/webhook/owner-one')).status, 401);
  assert.equal((await send(grant.secret, undefined, '1000000000')).status, 401);
  assert.equal(f.records.size, 0);
  assert.deepEqual(await send(grant.secret).then(r => r.json()), { imported: 1, duplicates: 0 });
  assert.deepEqual(await send(grant.secret).then(r => r.json()), { imported: 0, duplicates: 1 });
  await f.request('/netflix/connection', { method: 'POST', body: '{}' });
  assert.equal((await send(grant.secret)).status, 401);
  await f.request('/netflix/connection', { method: 'DELETE' });
  assert.equal((await send(grant.secret)).status, 401);
});
test('missing encryption key prevents webhook enablement', async t => {
  const f = await fixture(t, '');
  assert.equal((await f.request('/netflix/connection', { method: 'POST', body: '{}' })).status, 503);
  assert.equal(f.credentials.size, 0);
});
