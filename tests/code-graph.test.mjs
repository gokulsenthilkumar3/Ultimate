import test from 'node:test';
import assert from 'node:assert/strict';
import { importsOf, resolveImport, neighbours, impactOf, coverageOf, assertFreshGraph } from '../scripts/code-graph.mjs';

test('syntax parsing ignores comment and string lookalikes and retains import provenance', () => {
  const source = `// import './fake.js';
const text = "require('./fake.js')";
import './styles.css';
export { value } from './value.js';
const lazy = import('./lazy');
const common = require('./common');
const computed = import(variable);`;
  assert.deepEqual(importsOf('src/app.ts', source), { diagnostics: 0, computedImports: 1, imports: [
    { specifier: './styles.css', line: 3, kind: 'static', typeOnly: false }, { specifier: './value.js', line: 4, kind: 'reexport', typeOnly: false },
    { specifier: './lazy', line: 5, kind: 'dynamic', typeOnly: false }, { specifier: './common', line: 6, kind: 'require', typeOnly: false },
  ] });
});

test('freshness rejects edits, additions, deletions, same-size inventory replacements and policy/schema changes', () => {
  const graph = { version: 3, exclusionsHash: 'policy', files: { a: 'hash-a', b: 'hash-b' } };
  assert.doesNotThrow(() => assertFreshGraph(graph, { b: 'hash-b', a: 'hash-a' }, 'policy'));
  for (const files of [
    { a: 'edited', b: 'hash-b' },
    { a: 'hash-a', b: 'hash-b', c: 'hash-c' },
    { a: 'hash-a' },
    { a: 'hash-a', c: 'hash-b' },
  ]) assert.throws(() => assertFreshGraph(graph, files, 'policy'), /sources changed/);
  assert.throws(() => assertFreshGraph(graph, graph.files, 'new-policy'), /policy changed/);
  assert.throws(() => assertFreshGraph({ ...graph, version: 2 }, graph.files, 'policy'), /version or policy/);
});

test('coverage distinguishes unresolved relative imports, packages and computed calls with bounded output', () => {
  const graph = { scope: 'test', diagnostics: [{ file: 'broken', parseErrors: 2 }, { file: 'other', parseErrors: 1 }], coverage: [
    { file: 'a', resolved: 3, unresolvedRelative: 1, nonRelative: 2, computed: 0 },
    { file: 'b', resolved: 2, unresolvedRelative: 0, nonRelative: 1, computed: 2 },
    { file: 'c', resolved: 1, unresolvedRelative: 0, nonRelative: 4, computed: 0 },
  ] };
  const result = coverageOf(graph, 1);
  assert.deepEqual(result.totals, { resolved: 6, unresolvedRelative: 1, nonRelative: 7, computed: 2 });
  assert.equal(result.gaps[0].file, 'b');
  assert.equal(result.filesWithGaps, 2);
  assert.equal(result.gapsTruncated, true);
  assert.equal(result.diagnosticsTruncated, true);
  assert.equal(result.parsedFiles, 3);
  assert.throws(() => coverageOf(graph, 0));
});

test('credential-like assignments do not corrupt syntax or leak into extracted metadata', () => {
  const result = importsOf('example.tsx', `const options = { password: 'fictional-value' };\nimport './safe';`);
  assert.equal(result.diagnostics, 0);
  assert.deepEqual(result.imports, [{ specifier: './safe', line: 2, kind: 'static', typeOnly: false }]);
  assert.ok(!JSON.stringify(result).includes('fictional-value'));
});

test('resolution only connects allowed paths and supports TypeScript and index modules', () => {
  const files = new Set(['src/value.ts', 'src/module/index.tsx', 'src/style.css']);
  assert.equal(resolveImport('src/app.ts', './value.js', files), 'src/value.ts');
  assert.equal(resolveImport('src/app.ts', './module', files), 'src/module/index.tsx');
  assert.equal(resolveImport('src/app.ts', './style.css?inline', files), 'src/style.css');
  for (const specifier of ['react', '@/value', '../.env', './missing', '../../../outside']) assert.equal(resolveImport('src/app.ts', specifier, files), null);
});

test('queries bound and deduplicate both graph directions even with cycles', () => {
  const graph = { files: { a: '', b: '', c: '' }, edges: [{ from: 'a', to: 'b' }, { from: 'a', to: 'b' }, { from: 'b', to: 'a' }, { from: 'a', to: 'c' }] };
  assert.deepEqual(neighbours(graph, 'a', 1), { file: 'a', imports: ['b'], importedBy: ['b'], totalImports: 2, totalImportedBy: 1 });
  assert.throws(() => neighbours(graph, '../outside'));
});

const impactGraph = {
  files: { shared: '', a: '', b: '', app: '', entry: '', unrelated: '' },
  edges: [
    { from: 'b', to: 'shared', line: 4 }, { from: 'a', to: 'shared', line: 2 },
    { from: 'app', to: 'a', line: 6 }, { from: 'app', to: 'b', line: 7 },
    { from: 'entry', to: 'app', line: 9 }, { from: 'shared', to: 'entry', line: 1 },
  ],
};

test('explicit type-only declarations are separated while mixed and side-effect imports remain runtime candidates', () => {
  const source = `import type { A } from './a';
import { type B } from './b';
import { type C, value } from './c';
import Default, { type D } from './d';
import {} from './e';
export type * from './f';
export { type G } from './g';
export { type H, value } from './h';`;
  assert.deepEqual(importsOf('example.ts', source).imports.map(item => item.typeOnly), [true, true, false, false, false, true, true, false]);
});

test('runtime traversal excludes type-only branches but retains alternate runtime paths', () => {
  const graph = { files: { core: '', types: '', app: '', runtime: '' }, edges: [
    { from: 'types', to: 'core', line: 1, typeOnly: true },
    { from: 'app', to: 'types', line: 2, typeOnly: false },
    { from: 'runtime', to: 'core', line: 3, typeOnly: false },
    { from: 'app', to: 'runtime', line: 4, typeOnly: false },
  ] };
  assert.equal(impactOf(graph, 'core').affected.length, 3);
  assert.deepEqual(impactOf(graph, 'core', { runtimeOnly: true }).affected, [
    { file: 'runtime', depth: 1, imports: 'core', line: 3 },
    { file: 'app', depth: 2, imports: 'runtime', line: 4 },
  ]);
});

test('impact returns shortest deterministic import evidence through diamonds and cycles', () => {
  const result = impactOf(impactGraph, 'shared');
  assert.deepEqual(result.affected, [
    { file: 'a', depth: 1, imports: 'shared', line: 2 },
    { file: 'b', depth: 1, imports: 'shared', line: 4 },
    { file: 'app', depth: 2, imports: 'a', line: 6 },
    { file: 'entry', depth: 3, imports: 'app', line: 9 },
  ]);
  assert.equal(result.truncated, false);
  assert.equal(result.depthLimited, false);
  assert.deepEqual(impactOf(impactGraph, 'unrelated').affected, []);
});

test('impact reports output and depth truncation and rejects unsafe bounds', () => {
  const limited = impactOf(impactGraph, 'shared', { limit: 2 });
  assert.equal(limited.affected.length, 2);
  assert.equal(limited.truncated, true);
  const shallow = impactOf(impactGraph, 'shared', { maxDepth: 1 });
  assert.equal(shallow.affected.length, 2);
  assert.equal(shallow.depthLimited, true);
  for (const options of [{ limit: 0 }, { limit: 1001 }, { maxDepth: 33 }, { maxDepth: NaN }, { limit: 1.5 }]) assert.throws(() => impactOf(impactGraph, 'shared', options));
  assert.throws(() => impactOf(impactGraph, '../outside'));
});
