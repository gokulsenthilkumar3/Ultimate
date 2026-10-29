// Deterministic startup budgets plus optional isolated-browser regression checks.
// Does not start an application service or read the owner's data/environment.
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const manifest = JSON.parse(await readFile(path.join(dist, '.vite/manifest.json'), 'utf8'));
const seen = new Set();
function visit(key) {
  if (seen.has(key)) return;
  assert(manifest[key], `Missing build entry: ${key}`);
  seen.add(key);
  for (const dependency of manifest[key].imports || []) visit(dependency);
}
visit('index.html');
const files = [...new Set([...seen].flatMap(key => [manifest[key].file, ...(manifest[key].css || [])]))];
let js = 0, css = 0, brotli = 0, gzip = 0;
const verified = new Set();
async function compressedSizes(file, size) {
  const source = await readFile(path.join(dist, file));
  const br = await readFile(path.join(dist, file + '.br'));
  const gz = await readFile(path.join(dist, file + '.gz'));
  assert(brotliDecompressSync(br, { maxOutputLength: size }).equals(source), `Stale Brotli asset: ${file}`);
  assert(gunzipSync(gz, { maxOutputLength: size }).equals(source), `Stale gzip asset: ${file}`);
  verified.add(file);
  return { br: br.length, gz: gz.length };
}
for (const file of files) {
  const { size } = await stat(path.join(dist, file));
  if (file.endsWith('.js')) js += size;
  if (file.endsWith('.css')) css += size;
  if (size >= 1024) {
    const compressed = await compressedSizes(file, size);
    brotli += compressed.br; gzip += compressed.gz;
  } else { brotli += size; gzip += size; }
}
for (const name of await readdir(path.join(dist, 'assets'))) {
  const file = 'assets/' + name;
  if (!/^assets\/[^/]+-[\w-]{6,}\.(?:js|css)$/.test(file) || verified.has(file)) continue;
  const { size } = await stat(path.join(dist, file));
  if (size >= 1024) await compressedSizes(file, size);
}
console.log(`Verified ${verified.size} Brotli/gzip asset pairs against the final build.`);
assert(js < 450000, `Eager JavaScript ${js} bytes exceeds the 450000-byte budget.`);
assert(css < 320000, `Eager CSS ${css} bytes exceeds the 320000-byte budget.`);
console.log(`Startup budgets pass: JS ${js}/450000 bytes; CSS ${css}/320000 bytes.`);
console.log(`Startup code and CSS: ${js + css} decoded bytes; ${brotli} with Brotli; ${gzip} with gzip (fonts and response headers excluded).`);

const option = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const reportFile = option('report');
const baselineFile = option('baseline');
assert(!baselineFile || reportFile, '--baseline requires --report.');
if (reportFile) {
  const report = JSON.parse(await readFile(path.resolve(root, reportFile), 'utf8'));
  assert(!report.profiled, 'CPU profiles are diagnostic; collect an unprofiled run for budget comparisons.');
  const baseline = baselineFile && JSON.parse(await readFile(path.resolve(root, baselineFile), 'utf8'));
  if (baseline) {
    assert(!baseline.profiled, 'A CPU-profiled baseline cannot be used for timing comparisons.');
    assert.equal(report.fixtureName || 'empty', baseline.fixtureName || 'empty', 'Compare the same fixture scenario.');
    assert.deepEqual(report.recordCounts || {}, baseline.recordCounts || {}, 'Compare the same record counts.');
    assert.equal(report.countFormatters ?? Boolean(report.fixtureName), baseline.countFormatters ?? Boolean(baseline.fixtureName), 'Compare the same instrumentation.');
    assert.equal(report.runs, baseline.runs, 'Compare the same number of samples.');
    assert.equal(report.stateDelayMs, baseline.stateDelayMs, 'Compare the same fixture delay.');
    assert.equal(report.browser, baseline.browser, 'Compare the same browser version.');
    assert.deepEqual(report.pages.map(page => page.path).sort(), baseline.pages.map(page => page.path).sort(), 'Compare the same route coverage.');
  }
  for (const page of report.pages) {
    assert.deepEqual(page.failures, [], `${page.path} failed to render.`);
    assert(page.samples.every(sample => sample.stateRequests === (page.public ? 0 : 1)), `${page.path} made duplicate or unexpected workspace snapshot requests.`);
    if (report.fixtureName === 'populated' && page.id === 'notes') assert(page.metrics.domNodes < 2500, 'The Notes library rendered too many DOM nodes.');
    if (report.fixtureName === 'populated' && ['goals', 'shopping'].includes(page.id)) assert(page.metrics.domNodes < 2000, `${page.id} rendered too many collection DOM nodes.`);
    if (['equity', 'forex', 'family', 'companion'].includes(page.id)) assert(page.samples.every(sample => sample.childDocuments?.length === 0), `${page.id} loaded a companion before confirmed readiness in the unavailable-service fixture.`);
    if (report.fixtureName === 'populated' && page.id === 'portfolio' && page.metrics.numberFormats != null) assert(page.metrics.numberFormats < 20, 'Portfolio formatting repeatedly constructs formatters.');
    if (page.id === 'dashboards') {
      assert(page.metrics.jsBytes < 1000000, 'The default dashboard exceeds its 1000000-byte JavaScript budget.');
      assert(page.samples.every(sample => sample.resources.every(resource => !resource.file.startsWith('html2canvas-'))), 'Dashboard export code loaded before an export was requested.');
    }
    const { metrics } = page;
    assert(metrics.fcp != null && metrics.lcp != null, `${page.path} is missing paint measurements.`);
    assert(metrics.fcp < 1800 && metrics.lcp < 2500, `${page.path} exceeds the synthetic paint budget.`);
    if (page.module) {
      assert(metrics.moduleStart != null && metrics.stateEnd != null && metrics.moduleStart < metrics.stateEnd, `${page.path} still loads its route code after workspace data.`);
    }
    const before = baseline?.pages.find(candidate => candidate.path === page.path);
    if (before) {
      assert(metrics.jsBytes <= before.metrics.jsBytes * 1.1, `${page.path} JavaScript increased by over 10%.`);
      assert(metrics.cssBytes <= before.metrics.cssBytes * 1.1, `${page.path} CSS increased by over 10%.`);
    }
  }
  console.log(`Browser budgets pass for ${report.pages.length} page(s). Timings describe the synthetic fixture only.`);
}
