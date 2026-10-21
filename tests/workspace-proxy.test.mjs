import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createGateway } from '../scripts/gateway.mjs';
import { resolveApiRoute, createUiProxies } from '../scripts/workspace-proxy.mjs';

test('API namespaces resolve to native backend routes', () => {
  const cases = [
    ['/api/ultimate/health', 'ultimate', '/api/health'],
    ['/api/ultimate/api/profile', 'ultimate', '/api/profile'],
    ['/api/profile', 'ultimate', '/api/profile'],
    ['/auth/session', 'ultimate', '/auth/session'],
    ['/api/family/trees', 'family', '/api/v1/trees'],
    ['/api/family/api/v1/trees', 'family', '/api/v1/trees'],
    ['/api/family/uploads/a.jpg', 'family', '/uploads/a.jpg'],
    ['/api/family/health', 'family', '/health'],
    ['/api/forex/predict', 'forex', '/predict'],
    ['/api/oxfin/user/balance', 'oxfin', '/Ultimate/products/oxfin/api/user/balance'],
    ['/api/equity/quotes', 'equity', '/Ultimate/products/equity/api/quotes'],
    ['/db/api/tables', 'studio', '/api/tables'],
    ['/api/db/sources', 'studio', '/api/sources'],
  ];
  for (const [input, id, path] of cases) assert.deepEqual(resolveApiRoute(input), { id, path });
  assert.equal(resolveApiRoute('/unknown'), null);
});

test('UI proxies keep product asset paths and WebSockets and send APIs to the gateway', () => {
  const proxies = createUiProxies({});
  for (const id of ['finsync', 'oxfin', 'equity', 'family', 'forex']) {
    assert.equal(proxies[`/Ultimate/products/${id}`].ws, true);
    const api = proxies[`/Ultimate/products/${id}/api`];
    assert.equal(api.target, 'http://127.0.0.1:5300');
    assert.equal(api.rewrite(`/Ultimate/products/${id}/api/session?q=1`), `/api/${id}/session?q=1`);
  }
  assert.equal(proxies['/auth'].target, proxies['/api'].target);
  assert.equal(proxies['/db'].target, proxies['/api'].target);
});

test('gateway preserves request body, query, cookies, authorization and response cookies', async () => {
  const upstream = http.createServer((req, res) => {
    let body = ''; req.on('data', chunk => { body += chunk; });
    req.on('end', () => { res.setHeader('set-cookie', 'test-session=value; Path=/; HttpOnly'); res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ url: req.url, method: req.method, cookie: req.headers.cookie, authorization: req.headers.authorization, csrf: req.headers['x-csrf-token'], body })); });
  });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const gateway = createGateway({ targets: { family: `http://127.0.0.1:${upstream.address().port}` } });
  await new Promise(resolve => gateway.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${gateway.address().port}/api/family/trees?preview=1`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'owner=fixture', authorization: 'Bearer fixture', 'x-csrf-token': 'fixture' }, body: '{"name":"fixture"}' });
    assert.deepEqual(await response.json(), { url: '/api/v1/trees?preview=1', method: 'POST', cookie: 'owner=fixture', authorization: 'Bearer fixture', csrf: 'fixture', body: '{"name":"fixture"}' });
    assert.equal(response.headers.get('set-cookie'), 'test-session=value; Path=/; HttpOnly');
  } finally { gateway.closeAllConnections(); upstream.closeAllConnections(); await Promise.all([new Promise(resolve => gateway.close(resolve)), new Promise(resolve => upstream.close(resolve))]); }
});
