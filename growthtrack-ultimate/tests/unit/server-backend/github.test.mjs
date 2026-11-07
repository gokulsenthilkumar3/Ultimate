import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { registerGithubRoutes } from '../../../server/domains/github.js';
import { createSealer } from '../../../server/domains/sync/sealer.js';

const key = 'ab'.repeat(32), token = 'synthetic-test-token-1234567890';
const json = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
async function fixture(t, fetchImpl, encryptionKey = key) {
  let row = null; const calls = [];
  const prisma = { integrationCredential: {
    findUnique: async query => { calls.push(query); return row?.userId === query.where.userId_provider.userId ? row : null; },
    upsert: async args => { row = { id: 'connection', ...args.create }; return row; },
    deleteMany: async () => { row = null; return { count: 1 }; },
  } };
  const app = express(); app.use(express.json());
  const auth = (req, res, next) => { if (req.headers.authorization !== 'Fixture owner') return res.sendStatus(401); req.user = { id: 'owner-one' }; next(); };
  registerGithubRoutes(app, auth, { prisma, config: { security: { encryptionKey } }, fetchImpl });
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (path, options = {}) => fetch(`http://127.0.0.1:${server.address().port}/api/integrations/github${path}`, { ...options, headers: { Authorization: 'Fixture owner', 'Content-Type': 'application/json', ...options.headers } });
  return { request, row: () => row, calls };
}

test('requires owner authentication and never stores an unencrypted provider secret', async t => {
  let upstream = 0;
  const f = await fixture(t, async () => { upstream++; return json({ login: 'fixture' }); }, '');
  assert.equal((await f.request('/connection', { headers: { Authorization: '' } })).status, 401);
  assert.equal((await f.request('/connection', { method: 'PUT', body: JSON.stringify({ token }) })).status, 503);
  assert.equal(f.row(), null); assert.equal(upstream, 0);
});
test('seals tokens by owner, excludes them from responses, paginates private reads independently of management', async t => {
  const urls = [];
  const repo = id => ({ id, name: `repo-${id}`, owner: { login: 'fixture' }, private: true, html_url: 'javascript:alert(1)' });
  const f = await fixture(t, async (url, options) => {
    urls.push(url);
    assert.equal(url.origin, 'https://api.github.com'); assert.equal(options.redirect, 'error');
    assert.equal(options.headers.Authorization, `Bearer ${token}`);
    if (url.pathname === '/user') return json({ login: 'fixture' });
    return json(url.searchParams.get('page') === '1' ? Array.from({ length: 100 }, (_, id) => repo(id)) : [repo(100)]);
  });
  const connected = await f.request('/connection', { method: 'PUT', body: JSON.stringify({ token }) });
  assert.equal(connected.status, 200); assert.ok(!(await connected.text()).includes(token));
  assert.ok(f.row().accessTokenCiphertext.startsWith('gcm1:'));
  const seal = createSealer(key); assert.equal(seal.open(f.row().accessTokenCiphertext, 'owner-one:github:secret'), token);
  assert.throws(() => seal.open(f.row().accessTokenCiphertext, 'another:github:secret'));
  const repos = await f.request('/repos?username=attacker');
  assert.equal(repos.headers.get('cache-control'), 'private, no-store');
  const data = await repos.json(); assert.equal(data.repositories.length, 101); assert.equal(data.visibility, 'authorized');
  assert.equal(data.repositories[0].html_url, 'https://github.com/fixture/repo-0');
  assert.equal(data.truncated, false);
  assert.ok(urls.some(url => url.searchParams.get('affiliation')?.includes('organization_member')));
  assert.equal((await f.request('/repos', { method: 'POST', body: JSON.stringify({ name: 'new', description: '', private: true }) })).status, 403);
});
test('public reads disclose their limited scope and reject URL-shaped usernames', async t => {
  let calls = 0;
  const f = await fixture(t, async (_url, options) => { calls++; assert.equal(options.headers.Authorization, undefined); return json([]); });
  assert.equal((await f.request('/repos?username=https://evil.test')).status, 400);
  assert.equal(calls, 0);
  const data = await f.request('/repos?username=fixture').then(response => response.json());
  assert.equal(data.visibility, 'public-only');
});
test('management needs explicit enablement and exact deletion confirmation', async t => {
  let deletes = 0;
  const f = await fixture(t, async (url, options) => {
    if (url.pathname === '/user') return json({ login: 'fixture' });
    if (options.method === 'DELETE') { deletes++; return new Response(null, { status: 204 }); }
    throw Error('Unexpected upstream request');
  });
  await f.request('/connection', { method: 'PUT', body: JSON.stringify({ token, allowManagement: true }) });
  assert.equal((await f.request('/repos/fixture/repo', { method: 'DELETE', body: '{}' })).status, 400);
  assert.equal(deletes, 0);
  assert.equal((await f.request('/repos/fixture/repo', { method: 'DELETE', body: JSON.stringify({ confirmation: 'fixture/repo' }) })).status, 200);
  assert.equal(deletes, 1);
});
