import test from 'node:test';
import assert from 'node:assert/strict';
import { boundaryViolations } from '../scripts/check-architecture.mjs';

const src = 'growthtrack-ultimate/src/';
const edge = (from, to) => ({ from: src + from, to: src + to, line: 7, kind: 'dynamic', typeOnly: false });
test('rejects production demo, backend and sibling implementation imports with evidence', () => {
  const edges = [edge('App.jsx', 'admin-demo/fixtures.js'), edge('domains/family/Page.tsx', 'domains/equity/private.ts'), { ...edge('App.jsx', 'x'), to: 'growthtrack-ultimate/server/db.js' }];
  const results = boundaryViolations(edges);
  assert.equal(results.length, 3);
  assert.equal(results[1].line, 7);
  assert.equal(results[1].to, src + 'domains/equity/private.ts');
});
test('allows domain ownership, shared primitives, contracts and isolated tests/demo', () => {
  assert.deepEqual(boundaryViolations([
    edge('domains/family/Page.tsx', 'domains/family/api.ts'),
    edge('domains/family/Page.tsx', 'domains/native/Table.tsx'),
    edge('domains/family/Page.tsx', 'domains/equity/contracts/quote.ts'),
    edge('admin-demo/index.jsx', 'admin-demo/fixtures.js'),
    edge('tests/example.test.jsx', 'admin-demo/fixtures.js'),
  ]), []);
});
