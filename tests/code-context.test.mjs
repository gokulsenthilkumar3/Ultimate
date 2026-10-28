import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { isIndexable, chunkSource, redactSource, searchIndex } from '../scripts/code-context.mjs';
import { DEFAULT_EXCLUSIONS, loadExclusions, resolveExclusions } from '../scripts/code-index-policy.mjs';

test('retrieval excludes secrets, copied agents, personal data, generated files and path traversal', () => {
  for (const file of ['.env', 'FinSync/apps/web/.env.local', 'growthtrack-ultimate/.env.test', 'Claude/validate-glb.js', 'growthtrack-ultimate/.claude/skills/tool.md', 'growthtrack-ultimate/src/vault/record.md', 'Forex/outputs/model.py', '../outside.js', 'growthtrack-ultimate/src/credentials.json']) assert.equal(isIndexable(file), false, file);
  for (const file of ['growthtrack-ultimate/src/App.jsx', 'growthtrack-ultimate/server.js', 'growthtrack-ultimate/prisma/schema.prisma', 'FinSync/apps/web/lib/firebase.ts', 'scripts/workspace.mjs']) assert.equal(isIndexable(file), true, file);
});
test('chunks have bounded size and line provenance, with credential literals redacted', () => {
  const source = Array.from({ length: 180 }, (_, i) => `export const item${i} = ${i};`).join('\n');
  const chunks = chunkSource('example.js', source);
  assert.ok(chunks.length >= 3);
  assert.equal(chunks[0].start, 1);
  assert.equal(chunks.at(-1).end, 180);
  assert.ok(chunks.every(c => c.content.length <= 4400));
  assert.ok(!redactSource('const password = "fictional-test-value";').includes('fictional-test-value'));
});
test('search obeys context and result limits and prioritises the relevant product', () => {
  const index = { chunks: [...chunkSource('FinSync/customer.js', 'export function listCustomers() { return "FinSync customer directory"; }'), ...chunkSource('GrowthTrack/training.js', 'export function trainingSchedule() { return "Training"; }')] };
  const result = searchIndex(index, 'FinSync customers', { limit: 1, maxChars: 1000 });
  assert.equal(result.length, 1); assert.equal(result[0].file, 'FinSync/customer.js');
  assert.ok(result[0].content.length <= 1000); assert.equal(searchIndex(index, '').length, 0);
});
test('an exact symbol outranks scattered words from its camel-case name', () => {
  const index = { chunks: [
    ...chunkSource('other.js', 'const jwt = "jwt"; const secret = process.env.SECRET; function get() { return jwt + secret; }'),
    ...chunkSource('environment.ts', 'export function getJwtSecret() { return process.env.JWT_SECRET; }'),
  ] };
  assert.equal(searchIndex(index, 'getJwtSecret', { limit: 1 })[0].file, 'environment.ts');
});
test('fresh checkouts use the checked-in exclusion policy without a local ignore file', () => {
  const missingPath = path.resolve('node_modules/.growthtrack-policy-file-not-present');
  assert.equal(fs.existsSync(missingPath), false);
  assert.deepEqual(loadExclusions(missingPath), resolveExclusions());
  for (const rule of DEFAULT_EXCLUSIONS) assert.ok(loadExclusions(missingPath).includes(rule), rule);
});
test('machine-local exclusions extend defaults without negating them', () => {
  const combined = resolveExclusions('# Local rules\r\nlocal-research/\r\n!secrets/\r\nlocal-research/\r\nscratch\\notes/\r\n');
  assert.ok(combined.includes('local-research'));
  assert.ok(combined.includes('scratch/notes'));
  assert.ok(combined.includes('secrets'));
  assert.equal(combined.filter(rule => rule === 'local-research').length, 1);
  assert.ok(!combined.includes('!secrets'));
});
test('Git ignores generated indexes and local ignore overrides across applications', () => {
  const files = ['.codeindexignore', '.code-index/source.json', 'growthtrack-ultimate/.codeindexignore', 'FinSync/apps/web/.code-index/source.json'];
  const output = execFileSync('git', ['check-ignore', '--no-index', '--stdin'], { input: files.join('\n') + '\n', encoding: 'utf8' });
  assert.deepEqual(output.trim().split(/\r?\n/), files);
  assert.equal(execFileSync('git', ['ls-files', '--', '.codeindexignore', '.code-index'], { encoding: 'utf8' }), '');
});
