import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGraph, coverageOf } from './code-graph.mjs';

const src = 'growthtrack-ultimate/src/';
const domain = file => file.startsWith(`${src}domains/`) ? file.slice(`${src}domains/`.length).split('/')[0] : null;
const testFile = file => /(?:\/tests?\/|\.(?:test|spec)\.[cm]?[jt]sx?$)/.test(file);

// Apply ownership rules only to resolved edges. Graph coverage explicitly reports
// aliases, computed references and other unsupported dependency forms.
export function boundaryViolations(edges) {
  return edges.flatMap(edge => {
    const { from, to } = edge;
    if (!from.startsWith(src) || testFile(from) || from.startsWith(`${src}admin-demo/`)) return [];
    let rule;
    if (to.startsWith(`${src}admin-demo/`)) rule = 'Production source imports fictional demo implementation';
    else if (/^growthtrack-ultimate\/(?:server|scripts)\//.test(to)) rule = 'Browser source imports server/tooling implementation';
    else if (domain(from) && domain(to) && domain(from) !== domain(to) && domain(to) !== 'native' && !to.includes('/contracts/')) rule = 'Sibling domains must share explicit contracts or native primitives';
    return rule ? [{ ...edge, rule }] : [];
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const graph = buildGraph();
  const violations = boundaryViolations(graph.edges);
  console.log(JSON.stringify({ scope: graph.scope, coverage: coverageOf(graph), violations }, null, 2));
  if (violations.length) process.exitCode = 1;
}
