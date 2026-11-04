import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { registerCustomerAdminRoutes } from '../../../server/domains/customerAdmin.js';

const environment = { NODE_ENV: 'production', CUSTOMER_ADMIN_FINSYNC_URL: 'https://finance.example/FinSync', CUSTOMER_ADMIN_FINSYNC_TOKEN: '11'.repeat(32), CUSTOMER_ADMIN_FINSYNC_READERS: 'authorized' };
const payload = { product: 'finsync', limit: 25, offset: 0, total: 1, rows: [{ id: 'customer', product: 'finsync', name: 'Synthetic', email: 'synthetic@example.invalid', status: 'active', plan: 'unavailable', lastActiveAt: null, pan: 'must-not-escape' }] };

async function fixture(t, options = {}) {
  const calls = [], audits = [];
  const app = express();
  registerCustomerAdminRoutes(app, (req, _res, next) => { req.user = { id: req.get('X-Test-Actor') || 'authorized' }; next(); }, {
    environment, fetchImpl: async (url, config) => { calls.push({ url, config }); return Response.json(payload); }, writeEvent: async event => { audits.push(event); return true; }, ...options,
  });
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return { calls, audits, url: `http://127.0.0.1:${server.address().port}/api/admin/products/` };
}

test('read-only adapter scopes service identity, strips private fields and audits metadata only', async t => {
  const { url, calls, audits } = await fixture(t);
  const response = await fetch(url + 'finsync/customers');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const result = await response.json();
  assert.equal(result.rows[0].pan, undefined);
  assert.equal(calls[0].url.pathname, '/FinSync/api/admin/customers');
  assert.equal(calls[0].config.headers.Authorization, `Bearer ${environment.CUSTOMER_ADMIN_FINSYNC_TOKEN}`);
  assert.equal(calls[0].config.redirect, 'error');
  assert.deepEqual(audits[0].details, { product: 'finsync', result: 'success', count: 1 });
  assert.doesNotMatch(JSON.stringify(audits), /synthetic@example|must-not-escape/);
  assert.equal((await fetch(url + 'finsync/customers', { method: 'POST' })).status, 404);
});

test('missing adapters, unknown products, unauthorized actors and bad filters never call the service', async t => {
  const { url, calls } = await fixture(t);
  assert.equal((await fetch(url + 'unknown/customers')).status, 404);
  assert.equal((await fetch(url + 'oxfin/customers')).status, 503);
  assert.equal((await fetch(url + 'finsync/customers', { headers: { 'X-Test-Actor': 'other-owner' } })).status, 403);
  for (const query of ['limit=1000', 'offset=-1', 'q=a&q=b', 'tenant=victim']) assert.equal((await fetch(url + 'finsync/customers?' + query)).status, 400);
  assert.equal(calls.length, 0);
});

test('cross-product responses, audit failure and unsafe service endpoints fail closed', async t => {
  for (const options of [
    { fetchImpl: async () => Response.json({ ...payload, product: 'oxfin' }) },
    { writeEvent: async () => false },
    { environment: { ...environment, CUSTOMER_ADMIN_FINSYNC_URL: 'http://finance.example' } },
    { environment: { ...environment, CUSTOMER_ADMIN_FINSYNC_URL: 'https://user:password@finance.example' } },
    { environment: { ...environment, CUSTOMER_ADMIN_OXFIN_TOKEN: environment.CUSTOMER_ADMIN_FINSYNC_TOKEN } },
    { fetchImpl: async () => new Response('x'.repeat(256001)) },
  ]) {
    const { url } = await fixture(t, options);
    assert.equal((await fetch(url + 'finsync/customers')).status, 503);
  }
});
