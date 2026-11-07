// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import express from 'express';
import http from 'node:http';
import { registerFamilyBridge, createFamilyCircuitBreaker } from '../../server/domains/familyBridge.js';
import { classifyFamilyRequest, createFamilyAdmission, FamilyAdmissionError } from '../../server/domains/familyAdmission.js';

const secret = 'b2'.repeat(32), servers = [];
async function listen(app) { const server = http.createServer(app); servers.push(server); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); return `http://127.0.0.1:${server.address().port}`; }
afterEach(async () => { await Promise.all(servers.splice(0).map(server => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); })); });
const refusal = fn => { try { fn(); } catch (error) { return error; } throw new Error('Expected an admission refusal.'); };

describe('Family admission policy', () => {
  it('classifies requests by cost without reading bodies', () => {
    expect([
      ['GET', '/trees'], ['HEAD', '/members/x'], ['POST', '/session'], ['PUT', '/events/x'], ['DELETE', '/documents/x'],
      ['GET', '/documents/tree-1'], ['GET', '/documents/file/x'], ['GET', '/documents/upload/a.png'], ['POST', '/documents'], ['GET', '/ai/ask'], ['POST', '/ai/ask'],
    ].map(([method, path]) => classifyFamilyRequest(method, path))).toEqual(['read', 'read', 'write', 'write', 'write', 'read', 'transfer', 'transfer', 'transfer', 'ai', 'ai']);
  });

  it('rejects invalid limits instead of silently disabling a bound', () => {
    for (const limits of [{ windowMs: 0 }, { owners: 1.5 }, { read: { active: 0 } }, { write: { perWindow: -1 } }, { ai: { global: Number.NaN } }]) expect(() => createFamilyAdmission({ limits })).toThrow('Invalid Family admission limit.');
    expect(() => createFamilyAdmission().acquire('a', 'delete')).toThrow('Unknown Family request kind.');
  });

  it('bounds an account per window, reports the wait, and resets with the window', () => {
    let time = 1_000;
    const admission = createFamilyAdmission({ limits: { write: { perWindow: 2 } }, now: () => time });
    admission.acquire('a', 'write')(); admission.acquire('a', 'write')();
    const error = refusal(() => admission.acquire('a', 'write'));
    expect(error).toBeInstanceOf(FamilyAdmissionError);
    expect([error.status, error.code, error.retryAfter]).toEqual([429, 'FAMILY_RATE_LIMITED', 60]);
    admission.acquire('b', 'write')();
    time += 30_000; expect(refusal(() => admission.acquire('a', 'write')).retryAfter).toBe(30);
    time += 30_000; admission.acquire('a', 'write')();
  });

  it('bounds concurrency per account and globally, and release is idempotent', () => {
    const admission = createFamilyAdmission({ limits: { transfer: { active: 1, global: 2 } } });
    const first = admission.acquire('a', 'transfer');
    expect(refusal(() => admission.acquire('a', 'transfer')).code).toBe('FAMILY_REQUEST_ACTIVE');
    admission.acquire('b', 'transfer');
    const full = refusal(() => admission.acquire('c', 'transfer'));
    expect([full.status, full.code]).toEqual([503, 'FAMILY_BUSY']);
    expect(admission.snapshot().active.transfer).toBe(2);
    first(); first();
    expect(admission.snapshot().active.transfer).toBe(1);
    admission.acquire('c', 'transfer');
    admission.acquire('a', 'read')(); // other kinds are independent
  });

  it('keeps owner state bounded and expires idle accounts without exposing identifiers', () => {
    let time = 0;
    const admission = createFamilyAdmission({ limits: { owners: 2 }, now: () => time });
    admission.acquire('a', 'read')(); const held = admission.acquire('b', 'read');
    expect(refusal(() => admission.acquire('c', 'read')).code).toBe('FAMILY_BUSY');
    time += 60_000; // a is idle and expired; b still has a request in flight
    admission.acquire('c', 'read')();
    expect(admission.snapshot()).toEqual({ owners: 2, active: { read: 1, write: 0, transfer: 0, ai: 0 } });
    held();
  });
});

describe('Family bridge circuit breaker', () => {
  it('peeks without claiming the recovery probe and reports the remaining cooldown', () => {
    let time = 0;
    const circuit = createFamilyCircuitBreaker({ threshold: 1, cooldownMs: 15_000, now: () => time });
    expect(circuit.available()).toBe(true); circuit.failure();
    expect(circuit.available()).toBe(false); expect(circuit.retryAfter()).toBe(15);
    time = 10_001; expect(circuit.retryAfter()).toBe(5);
    time = 15_000; expect(circuit.available()).toBe(true); expect(circuit.available()).toBe(true);
    expect(circuit.acquire()).toBe(true); expect(circuit.available()).toBe(false);
    circuit.cancel(); expect(circuit.available()).toBe(true);
  });
});

describe('Family bridge admission', () => {
  function fixture(limits, upstream) {
    const calls = [], held = [], family = express();
    family.use(express.json());
    family.all('/api/v1/*path', (req, res) => {
      calls.push(`${req.method} ${req.path}`);
      if (upstream) return upstream(req, res, held);
      res.json({ ok: true });
    });
    return { calls, held, family, limits };
  }
  const hold = (req, res, held) => (req.method === 'POST' ? held.push(res) : res.json({ ok: true })); // writes stay in flight until released
  async function start({ family, limits }) {
    const familyUrl = await listen(family), core = express();
    core.use(express.json());
    registerFamilyBridge(core, (req, _res, next) => { req.user = { id: req.headers['x-test-user'] || 'owner' }; next(); }, { baseUrl: familyUrl, secret, admission: { limits } });
    return listen(core);
  }
  const until = async check => { for (let i = 0; i < 200 && !check(); i++) await new Promise(resolve => setTimeout(resolve, 10)); expect(check()).toBe(true); };
  const post = (base, user = 'owner') => fetch(base + '/api/native/family/events', { method: 'POST', headers: { 'content-type': 'application/json', 'x-test-user': user }, body: '{}' });

  it('refuses a second concurrent write for the same account before Family is contacted, and admits others', async () => {
    const f = fixture({ write: { active: 1 } }, hold);
    const base = await start(f);
    const first = post(base); await until(() => f.held.length === 1);
    const blocked = await post(base);
    expect(blocked.status).toBe(429); expect(blocked.headers.get('retry-after')).toBe('1'); expect(blocked.headers.get('cache-control')).toBe('no-store');
    expect((await blocked.json()).code).toBe('FAMILY_REQUEST_ACTIVE');
    const other = post(base, 'someone-else'); await until(() => f.held.length === 2);
    expect(f.calls).toHaveLength(2);
    f.held.forEach(res => res.json({ ok: true }));
    expect((await first).status).toBe(200); expect((await other).status).toBe(200);
    const again = post(base); await until(() => f.held.length === 3); // the slot was released
    f.held[2].json({ ok: true }); expect((await again).status).toBe(200);
  });

  it('releases the slot when the browser disconnects mid-request', async () => {
    const f = fixture({ write: { active: 1 } }, hold);
    const base = await start(f), abort = new AbortController();
    const pending = fetch(base + '/api/native/family/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}', signal: abort.signal }).catch(() => 'aborted');
    await until(() => f.held.length === 1); abort.abort(); expect(await pending).toBe('aborted');
    let status = 429;
    for (let i = 0; i < 100 && status === 429; i++) { await new Promise(resolve => setTimeout(resolve, 20)); status = (await fetch(base + '/api/native/family/trees')).status; }
    expect(status).toBe(200);
    const retry = fetch(base + '/api/native/family/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    await until(() => f.held.length === 2); f.held[1].json({ ok: true }); expect((await retry).status).toBe(200);
  });

  it('applies the per-window budget per account and keeps unsupported routes free', async () => {
    const f = fixture({ read: { perWindow: 2 } });
    const base = await start(f), get = (path, user = 'owner') => fetch(base + '/api/native/family' + path, { headers: { 'x-test-user': user } });
    expect((await get('/trees')).status).toBe(200); expect((await get('/trees')).status).toBe(200);
    expect((await get('/auth/login')).status).toBe(404); // not a Family route, no budget consumed
    const limited = await get('/trees');
    expect(limited.status).toBe(429); expect(Number(limited.headers.get('retry-after'))).toBeGreaterThanOrEqual(1);
    expect((await limited.json()).code).toBe('FAMILY_RATE_LIMITED');
    expect((await get('/trees', 'other')).status).toBe(200);
    expect(f.calls).toHaveLength(3);
  });

  it('does not count admission refusals as service failures or spend budget while the circuit is open', async () => {
    const f = fixture({ read: { perWindow: 4, active: 1 } }, (req, res, held) => { if (req.path === '/api/v1/members') return res.status(503).json({ error: 'down' }); held.push(res); });
    const base = await start(f), get = path => fetch(base + '/api/native/family' + path);
    const running = get('/trees'); await until(() => f.held.length === 1);
    for (let i = 0; i < 5; i++) expect((await (await get('/trees')).json()).code).toBe('FAMILY_REQUEST_ACTIVE'); // refusals never trip the circuit
    f.held[0].json({ ok: true }); expect((await running).status).toBe(200);
    for (let i = 0; i < 3; i++) expect((await get('/members')).status).toBe(503); // three service failures; the 4/4 read budget is now spent
    const open = await get('/trees'); // a spent budget would answer 429, so 503 shows the circuit is checked first
    expect(open.status).toBe(503); expect((await open.json()).code).toBe('FAMILY_CIRCUIT_OPEN'); expect(Number(open.headers.get('retry-after'))).toBeGreaterThan(1);
  });
});
