import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import express from 'express';
import bcrypt from 'bcryptjs';
import { loadServerConfig } from '../../../server/config.js';
import { contentSecurityPolicy } from '../../../server/contentSecurityPolicy.js';
import { createSecurity } from '../../../server/security.js';
import { consumeOwnerCode, totpAt, sessionHasMfa } from '../../../server/domains/ownerMfa.js';
import { migratedFixture } from './fixture.mjs';

const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'; // RFC's public SHA-1 test secret.
test('TOTP matches every published RFC 6238 SHA-1 test vector', () => {
  for (const [seconds, expected] of [[59, '94287082'], [1111111109, '07081804'], [1111111111, '14050471'], [1234567890, '89005924'], [2000000000, '69279037'], [20000000000, '65353130']]) {
    assert.equal(totpAt(SECRET, seconds * 1000, { digits: 8 }), expected);
  }
});

test('concurrent password attempts reserve throttle slots before querying a user', async () => {
  let lookups = 0;
  const security = createSecurity({ prisma: { user: { findUnique: async () => { lookups += 1; return null; } } },
    config: loadServerConfig({ LOGIN_MAX_ATTEMPTS: '2' }), logToFile: () => {}, writeEvent: async () => {} });
  const request = () => ({ body: { email: 'absent@example.test', password: 'wrong' }, ip: 'fixture-client', headers: {} });
  const response = () => ({ status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
  const responses = Array.from({ length: 8 }, response);
  await Promise.all(responses.map(res => security.login(request(), res)));
  assert.equal(lookups, 2);
  assert.equal(responses.filter(res => res.statusCode === 429).length, 6);
  assert.ok(responses.filter(res => res.statusCode === 401).every(res => res.body.error === 'Invalid credentials.'));
});

test('CSP authorizes trusted inline code by hash and rejects origin/directive injection', async () => {
  const config = loadServerConfig({ NODE_ENV: 'production', HANDOFF_SECRET: 'b'.repeat(64), CSP_CONNECT_ORIGINS: 'https://weather.example.test' });
  const script = 'window.themeReady = true;';
  const policy = contentSecurityPolicy(config, `<script>${script}</script><script src="/asset.js"></script>`);
  assert.ok(policy.includes(`'sha256-${createHash('sha256').update(script).digest('base64')}'`));
  assert.match(policy, /script-src-attr 'none'/);
  assert.doesNotMatch(policy, /'unsafe-eval'|script-src [^;]*'unsafe-inline'|connect-src [^;]*(?: http:| https:;| ws:| wss:)/);
  assert.ok(policy.split('; ').find(item => item.startsWith('connect-src ')).split(' ').includes('https://weather.example.test'));
  assert.throws(() => loadServerConfig({ APP_ORIGINS: 'https://app.test;script-src *' }), /APP_ORIGINS/);
  assert.throws(() => loadServerConfig({ CSP_CONNECT_ORIGINS: 'https://user:password@example.test' }), /CSP_CONNECT_ORIGINS/);
  assert.equal(loadServerConfig({}).server.listenHost, '127.0.0.1');
  const explorer = await fs.readFile(new URL('../../../api-explorer.html', import.meta.url), 'utf8');
  assert.doesNotMatch(explorer, /\bon(?:click|input)\s*=/);
  assert.doesNotMatch(explorer, /jwtToken|data\.token|\/api\/auth\/signup/);
});

test('MFA creates no session before a correct unused code, persists replay protection and preserves CSRF', async t => {
  const { prisma } = await migratedFixture(t);
  const password = 'fictional-owner-password';
  await prisma.user.update({ where: { id: 'owner-a' }, data: { passwordHash: await bcrypt.hash(password, 12) } });
  const config = loadServerConfig({ OWNER_MFA_SECRET: SECRET, LOGIN_MAX_ATTEMPTS: '30' });
  const security = createSecurity({ prisma, config, logToFile: () => {}, writeEvent: async () => {} });
  const app = express(); app.use(express.json());
  app.post('/login', security.login); app.get('/csrf', security.authenticate, security.csrf);
  app.put('/profile', security.authenticate, security.updateProfile);
  app.post('/private', security.authenticate, (_req, res) => res.json({ saved: true }));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = body => fetch(base + '/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'a@example.test', password, ...body }) });
  const challenge = await login({});
  assert.equal(challenge.status, 401); assert.equal((await challenge.json()).code, 'MFA_REQUIRED');
  assert.equal(await prisma.authSession.count(), 0);
  const otp = totpAt(SECRET, Date.now());
  assert.equal((await login({ password: 'wrong', otp })).status, 401);
  assert.equal(await prisma.authSession.count(), 0);
  const response = await login({ otp }); assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  assert.match(response.headers.get('set-cookie'), /HttpOnly/);
  const session = await prisma.authSession.findFirst();
  assert.ok(sessionHasMfa(session.csrfHash, SECRET));
  const csrfResponse = await fetch(base + '/csrf', { headers: { cookie } });
  const { csrfToken } = await csrfResponse.json();
  assert.equal((await fetch(base + '/private', { method: 'POST', headers: { cookie } })).status, 403);
  assert.equal((await fetch(base + '/private', { method: 'POST', headers: { cookie, 'X-CSRF-Token': csrfToken } })).status, 200);
  const overlong = await fetch(base + '/profile', { method: 'PUT', headers: { cookie, 'X-CSRF-Token': csrfToken, 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: password, newPassword: '😊'.repeat(19) }) });
  assert.equal(overlong.status, 400); assert.match((await overlong.json()).error, /72 UTF-8 bytes/);
  assert.equal((await login({ otp })).status, 401);
  // A new verifier uses the database counter, rather than a process-local map.
  assert.equal(await consumeOwnerCode({ prisma, secret: SECRET, userId: 'owner-a', code: otp }), false);
  const future = Date.now() + 120_000;
  const results = await Promise.all([1, 2].map(() => consumeOwnerCode({ prisma, secret: SECRET, userId: 'owner-a', code: totpAt(SECRET, future), now: future })));
  assert.equal(results.filter(Boolean).length, 1);
  await prisma.authSession.update({ where: { id: session.id }, data: { csrfHash: 'old-password-only-session' } });
  assert.equal((await fetch(base + '/csrf', { headers: { cookie } })).status, 401);
});
