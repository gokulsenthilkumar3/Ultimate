// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import http from 'node:http';
import { registerNativeModuleRoutes } from '../../server/domains/nativeModules.js';

const servers = [];
async function listen(app) {
  const server = http.createServer(app);
  servers.push(server);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}`;
}
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(servers.splice(0).map(server => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); })));
});

describe('Ultimate native market adapters', () => {
  it('exposes Equity and Forex through the authenticated Ultimate API', async () => {
    const upstream = express();
    upstream.get('/workspace/metadata', (_req, res) => res.json({ models: ['lgb'], currencies: ['USD'] }));
    const upstreamUrl = await listen(upstream);
    const app = express();
    const auth = (_req, _res, next) => next();
    const prices = vi.fn(async () => ({ quotes: [{ symbol: 'NIFTY', ltp: 1, open: 1 }], provider: 'fixture' }));
    registerNativeModuleRoutes(app, auth, { prices, forexUrl: upstreamUrl });
    const base = await listen(app);
    const equity = await fetch(`${base}/api/native/equity/prices`);
    expect(equity.status).toBe(200);
    expect((await equity.json()).provider).toBe('fixture');
    const forex = await fetch(`${base}/api/native/forex/metadata`);
    expect(forex.status).toBe(200);
    expect((await forex.json()).models).toEqual(['lgb']);
  });

  it('preserves a bounded Forex upstream validation message', async () => {
    const upstream = express();
    upstream.get('/workspace/history', (_req, res) => res.status(422).json({ detail: 'Select one to six configured currencies.' }));
    const upstreamUrl = await listen(upstream);
    const app = express();
    registerNativeModuleRoutes(app, (_req, _res, next) => next(), { forexUrl: upstreamUrl });
    const response = await fetch(`${await listen(app)}/api/native/forex/history?currencies=BAD`);
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ code: 'FOREX_UNAVAILABLE', error: 'Choose valid currencies, model and history window.' });
  });
});
