import test from 'node:test';
import assert from 'node:assert/strict';
import { createGateway } from '../scripts/gateway.mjs';
import http from 'node:http';

async function withGateway(run) {
  const server = createGateway();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try { await run(`http://127.0.0.1:${port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}

test('publishes the canonical five-product registry', () => withGateway(async base => {
  const response = await fetch(`${base}/api/gateway/products`);
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(payload.products.map(product => product.id), ['finsync', 'oxfin', 'forex', 'family', 'equity']);
}));

test('returns aggregate health without failing when products are offline', () => withGateway(async base => {
  const response = await fetch(`${base}/health`);
  const payload = await response.json();
  assert.equal(payload.status, 'online');
  assert.equal(payload.services.length, 8);
  assert.ok(payload.services.some(service => service.id === 'studio'));
  assert.equal(payload.products.length, 5);
}));

test('rejects unknown routes', () => withGateway(async base => {
  const response = await fetch(`${base}/unknown`);
  assert.equal(response.status, 404);
}));

test('all five product health contracts probe their intended owner and do not mask failures with a working homepage', async () => {
  const paths = [];
  const owner = http.createServer((req, res) => {
    paths.push(req.url);
    res.writeHead(req.url === '/' ? 200 : 503, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: 'unavailable' }));
  });
  await new Promise(resolve => owner.listen(0, '127.0.0.1', resolve));
  const target = `http://127.0.0.1:${owner.address().port}`;
  const ids = ['finsync', 'oxfin', 'equity', 'family', 'forex'];
  const gateway = createGateway({ targets: Object.fromEntries(ids.map(id => [id, target])) });
  await new Promise(resolve => gateway.listen(0, '127.0.0.1', resolve));
  try {
    for (const id of ids) {
      const response = await fetch(`http://127.0.0.1:${gateway.address().port}/api/${id}/health`);
      assert.equal(response.status, 503, id);
      if (['finsync', 'oxfin', 'equity'].includes(id)) {
        const result = await response.json();
        assert.equal(result.online, false);
        assert.equal(result.check, 'ui-reachability');
        assert.equal(result.dataReadiness, 'not-checked');
      }
    }
    assert.deepEqual(paths, ['/Ultimate/products/finsync/', '/Ultimate/products/oxfin/', '/Ultimate/products/equity/', '/health', '/health']);
    const aggregate = await fetch(`http://127.0.0.1:${gateway.address().port}/api/gateway/health`).then(response => response.json());
    for (const id of ids) assert.equal(aggregate.services.find(service => service.id === id).online, false);
    assert.ok(!paths.includes('/'));
  } finally {
    await new Promise(resolve => gateway.close(resolve));
    await new Promise(resolve => owner.close(resolve));
  }
});
