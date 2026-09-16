import test from 'node:test';
import assert from 'node:assert/strict';
import { createGateway } from '../scripts/gateway.mjs';

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
  assert.equal(payload.services.length, 7);
  assert.equal(payload.products.length, 5);
}));

test('rejects unknown routes', () => withGateway(async base => {
  const response = await fetch(`${base}/unknown`);
  assert.equal(response.status, 404);
}));
