/** Self-contained, offline graph viewer. Only policy-filtered metadata is embedded. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const directory = fileURLToPath(
  new URL('./code-graph-viewer/', import.meta.url),
);
const escapeJson = (value) =>
  JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
const cspHash = (text) =>
  `'sha256-${createHash('sha256').update(text).digest('base64')}'`;

export function renderGraphHtml(
  graph,
  { generatedAt = new Date().toISOString() } = {},
) {
  const css = fs.readFileSync(path.join(directory, 'viewer.css'), 'utf8');
  const script = fs.readFileSync(path.join(directory, 'viewer.js'), 'utf8');
  const data = {
    generatedAt,
    scope: graph.scope,
    files: Object.keys(graph.files).sort(),
    edges: graph.edges,
    coverage: graph.coverage,
    diagnostics: graph.diagnostics,
  };
  return fs
    .readFileSync(path.join(directory, 'viewer.html'), 'utf8')
    .replace(
      '<!-- CSP -->',
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${cspHash(script)}; style-src ${cspHash(css)}; connect-src 'none'; img-src data: blob:; base-uri 'none'; form-action 'none'">`,
    )
    .replace('<!-- CSS -->', `<style>${css}</style>`)
    .replace(
      '<!-- DATA -->',
      `<script id="graph-data" type="application/json">${escapeJson(data)}</script>`,
    )
    .replace('<!-- SCRIPT -->', `<script>${script}</script>`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { ROOT } = await import('./code-context.mjs');
  const input = path.join(ROOT, '.code-index/graph.json');
  if (!fs.existsSync(input))
    throw new Error('Run npm run context:graph first.');
  const graph = JSON.parse(fs.readFileSync(input, 'utf8'));
  const output = path.join(ROOT, '.code-index/graph.html');
  fs.writeFileSync(output, renderGraphHtml(graph));
  console.log(
    `Visual graph: ${output}\nOpen this HTML file in your browser. No server or internet connection is required.`,
  );
}
