/** Local architecture graph. Never executes inspected source or contacts a service. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { ROOT, sourceFiles, redactSource } from './code-context.mjs';
import { loadExclusions } from './code-index-policy.mjs';

const require = createRequire(path.join(ROOT, 'growthtrack-ultimate/package.json'));
const ts = require('typescript');
const output = path.join(ROOT, '.code-index/graph.json');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const policyHash = () => hash(loadExclusions(path.join(ROOT, '.codeindexignore')).join('\n'));
const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.scss'];

export function importsOf(file, source) {
  // Parse in memory before redaction: replacing whole lines can destroy JSX or
  // multiline syntax. Never persist source; filter literal specifiers below.
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const imports = []; let computedImports = 0;
  function visit(node) {
    let value; let kind = 'static'; let typeOnly = false;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) value = node.moduleSpecifier;
    else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) value = node.arguments[0];
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      typeOnly = !!clause?.isTypeOnly || !!(clause && !clause.name && clause.namedBindings && ts.isNamedImports(clause.namedBindings) && clause.namedBindings.elements.length && clause.namedBindings.elements.every(item => item.isTypeOnly));
    } else if (ts.isExportDeclaration(node)) {
      kind = 'reexport';
      typeOnly = !!node.isTypeOnly || !!(node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements.length && node.exportClause.elements.every(item => item.isTypeOnly));
    } else if (ts.isCallExpression(node)) kind = node.expression.kind === ts.SyntaxKind.ImportKeyword ? 'dynamic' : 'require';
    if (value && ts.isStringLiteral(value)) {
      if (redactSource(value.text) === value.text) imports.push({ specifier: value.text, line: ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1, kind, typeOnly });
    }
    else if (value) computedImports++;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return { imports, diagnostics: ast.parseDiagnostics.length, computedImports };
}

export function resolveImport(from, specifier, files) {
  if (!specifier.startsWith('.')) return null;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier.split(/[?#]/)[0]));
  const candidates = [base, ...extensions.map(ext => base + ext), ...extensions.map(ext => `${base}/index${ext}`)];
  if (/\.js$/.test(base)) candidates.push(base.slice(0, -3) + '.ts', base.slice(0, -3) + '.tsx');
  return candidates.find(candidate => files.has(candidate)) || null;
}

export function buildGraph() {
  const files = {}; const sources = new Map();
  for (const file of sourceFiles()) {
    const absolute = path.join(ROOT, file);
    if (!fs.existsSync(absolute)) continue;
    const stat = fs.lstatSync(absolute);
    if (!stat.isFile() || stat.size > 250000) continue;
    const source = fs.readFileSync(absolute, 'utf8');
    if (source.includes('\0')) continue;
    files[file] = hash(source);
    if (/\.[cm]?[jt]sx?$/.test(file)) sources.set(file, source);
  }
  const allowed = new Set(Object.keys(files)); const edges = []; const diagnostics = [];
  const coverage = [];
  for (const [file, source] of sources) {
    const parsed = importsOf(file, source);
    if (parsed.diagnostics) diagnostics.push({ file, parseErrors: parsed.diagnostics });
    const counts = { file, resolved: 0, unresolvedRelative: 0, nonRelative: 0, computed: parsed.computedImports };
    for (const item of parsed.imports) {
      // Only store resolved, policy-allowed paths; no arbitrary literal specifiers.
      const target = resolveImport(file, item.specifier, allowed);
      if (target) { edges.push({ from: file, to: target, line: item.line, kind: item.kind, typeOnly: item.typeOnly }); counts.resolved++; }
      else if (item.specifier.startsWith('.')) counts.unresolvedRelative++;
      else counts.nonRelative++;
    }
    coverage.push(counts);
  }
  const graph = { version: 3, scope: 'Static relative JS/TS imports, re-exports, literal dynamic imports and require calls. Aliases, external packages, computed imports and non-JS/TS dependencies are not resolved.', exclusionsHash: policyHash(), files, edges, diagnostics, coverage };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output + '.tmp', JSON.stringify(graph, null, 2) + '\n');
  fs.renameSync(output + '.tmp', output);
  return graph;
}

export function coverageOf(graph, limit = 25) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Coverage limit must be 1–100.');
  const totals = { resolved: 0, unresolvedRelative: 0, nonRelative: 0, computed: 0 };
  for (const item of graph.coverage) for (const key of Object.keys(totals)) totals[key] += item[key];
  const gaps = graph.coverage.filter(item => item.unresolvedRelative || item.computed)
    .sort((a, b) => (b.unresolvedRelative + b.computed) - (a.unresolvedRelative + a.computed) || a.file.localeCompare(b.file));
  return { scope: graph.scope, parsedFiles: graph.coverage.length, totals, filesWithGaps: gaps.length, gaps: gaps.slice(0, limit), gapsTruncated: gaps.length > limit, parseDiagnosticFiles: graph.diagnostics.length, diagnostics: graph.diagnostics.slice(0, limit), diagnosticsTruncated: graph.diagnostics.length > limit };
}

export function neighbours(graph, file, limit = 100) {
  if (!Object.hasOwn(graph.files, file)) throw new Error('File is not in the graph. Use a repository-relative indexed path.');
  const imports = [...new Set(graph.edges.filter(edge => edge.from === file).map(edge => edge.to))].sort();
  const importedBy = [...new Set(graph.edges.filter(edge => edge.to === file).map(edge => edge.from))].sort();
  return { file, imports: imports.slice(0, limit), importedBy: importedBy.slice(0, limit), totalImports: imports.length, totalImportedBy: importedBy.length };
}

/** Breadth-first reverse import traversal: shortest evidence chain, safe with cycles. */
export function impactOf(graph, file, { maxDepth = 8, limit = 100, runtimeOnly = false } = {}) {
  if (!Object.hasOwn(graph.files, file)) throw new Error('File is not in the graph. Use a repository-relative indexed path.');
  if (!Number.isInteger(maxDepth) || maxDepth < 1 || maxDepth > 32 || !Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('Impact bounds: depth 1–32, limit 1–1000.');
  const reverse = new Map();
  for (const edge of graph.edges) {
    if (runtimeOnly && edge.typeOnly) continue;
    if (!reverse.has(edge.to)) reverse.set(edge.to, []);
    reverse.get(edge.to).push(edge);
  }
  for (const edges of reverse.values()) edges.sort((a, b) => a.from.localeCompare(b.from) || a.line - b.line);
  const seen = new Set([file]); const queue = [{ file, depth: 0 }];
  const affected = []; let depthLimited = false;
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor];
    for (const edge of reverse.get(current.file) || []) {
      if (seen.has(edge.from)) continue;
      if (current.depth === maxDepth) { depthLimited = true; continue; }
      // Stop before growing the queue beyond the configured response budget.
      if (affected.length === limit) return { file, maxDepth, limit, truncated: true, depthLimited, affected };
      seen.add(edge.from);
      const item = { file: edge.from, depth: current.depth + 1, imports: current.file, line: edge.line };
      affected.push(item); queue.push(item);
    }
  }
  return { file, maxDepth, limit, truncated: false, depthLimited, affected };
}

export function assertFreshGraph(graph, currentFiles, exclusionsHash) {
  if (graph.version !== 3 || graph.exclusionsHash !== exclusionsHash) throw new Error('Graph version or policy changed. Run npm run context:graph.');
  const current = Object.keys(currentFiles);
  if (current.length !== Object.keys(graph.files).length || current.some(file => currentFiles[file] !== graph.files[file])) throw new Error('Graph sources changed. Run npm run context:graph.');
}

function readFreshGraph() {
  if (!fs.existsSync(output)) throw new Error('Run npm run context:graph first.');
  const graph = JSON.parse(fs.readFileSync(output, 'utf8'));
  const current = sourceFiles().filter(file => {
    const absolute = path.join(ROOT, file);
    return fs.existsSync(absolute) && fs.lstatSync(absolute).isFile() && fs.statSync(absolute).size <= 250000 && !fs.readFileSync(absolute, 'utf8').includes('\0');
  });
  assertFreshGraph(graph, Object.fromEntries(current.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))])), policyHash());
  return graph;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, file, depth, limit] = process.argv.slice(2);
  if (command === 'build') {
    const graph = buildGraph();
    console.log(JSON.stringify({ files: Object.keys(graph.files).length, edges: graph.edges.length, parseDiagnostics: graph.diagnostics.length, output: '.code-index/graph.json', scope: graph.scope }));
  } else if (command === 'query' && file) console.log(JSON.stringify(neighbours(readFreshGraph(), file.replaceAll('\\', '/')), null, 2));
  else if (command === 'coverage') console.log(JSON.stringify(coverageOf(readFreshGraph()), null, 2));
  else if ((command === 'impact' || command === 'impact-runtime') && file) console.log(JSON.stringify({ mode: command === 'impact-runtime' ? 'runtime' : 'all', ...impactOf(readFreshGraph(), file.replaceAll('\\', '/'), { maxDepth: depth === undefined ? 8 : Number(depth), limit: limit === undefined ? 100 : Number(limit), runtimeOnly: command === 'impact-runtime' }) }, null, 2));
  else throw new Error('Usage: code-graph.mjs build | coverage | query <file> | impact-runtime <file> | impact <file> [depth 1–32] [limit 1–1000]');
}
