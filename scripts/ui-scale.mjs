/** Synthetic model timing only; not a browser, user-load or production benchmark. */
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { tablePage } from '../growthtrack-ultimate/src/admin-demo/models/tableModel.js';
import { REVIEW_VERSION, compactReviews, restoreReviews, reviewCoverage } from '../growthtrack-ultimate/src/admin-demo/models/reviewModel.js';
import { PAGE_BY_ID, PAGE_VIEWS, reviewKey, reviewTargets } from '../growthtrack-ultimate/src/admin-demo/catalog.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scope = { theme: 'light', state: 'populated', density: 'comfortable', viewport: { width: 1440, height: 900 } };
const rows = Array.from({ length: 10000 }, (_, index) => ({ id: index, title: `Record ${index}`, amount: 10000 - index }));
const reviews = {};
for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 800 }, scope.viewport, { width: 1920, height: 1080 }, { width: 390, height: 844 }]) for (const target of reviewTargets()) {
  const page = PAGE_BY_ID[target.page];
  reviews[reviewKey(page, target.view, target.theme, target.state, `${viewport.width}x${viewport.height}`, target.density)] = { page: page.id, view: target.view, theme: target.theme, state: target.state, density: target.density, version: REVIEW_VERSION, path: page.path, viewport, status: 'approved', note: '', reviewedAt: '2026-10-28T08:00:00Z' };
}
function timing(label, operation) {
  for (let index = 0; index < 5; index++) operation();
  const samples = Array.from({ length: 40 }, () => { const start = performance.now(); operation(); return performance.now() - start; }).sort((a, b) => a - b);
  return { label, samples: samples.length, medianMs: +samples[Math.floor(samples.length / 2)].toFixed(3), p95Ms: +samples[Math.ceil(samples.length * .95) - 1].toFixed(3) };
}
const paged = tablePage(rows, [{ key: 'amount' }], { sort: 'amount', page: 399 });
if (paged.rows.length !== 25 || paged.pages !== 400) throw new Error('Unbounded or incorrect table page.');
const compact = compactReviews(reviews), restored = restoreReviews(compact), coverage = reviewCoverage(restored, scope);
if (Object.keys(restored).length !== reviewTargets().length * 5 || coverage.approved !== PAGE_VIEWS.length) throw new Error('Review coverage crossed scope or lost valid records.');
const result = {
  measuredAt: new Date().toISOString(), node: process.version,
  scope: 'Warm Node.js synthetic model operations. Excludes DOM, rendering, browser memory, network, APIs and concurrent users. Timings are observations, not production service-level claims.',
  records: rows.length, rowsPerDefaultPage: paged.rows.length, reviewRecords: Object.keys(restored).length, reviewSerializedBytes: Buffer.byteLength(JSON.stringify(reviews), 'utf8'), compactReviewSerializedBytes: Buffer.byteLength(JSON.stringify(compact), 'utf8'), viewsInOneScope: coverage.approved,
  timings: [timing('Sort 10,000 records and take a 25-row page', () => tablePage(rows, [{ key: 'amount' }], { sort: 'amount', page: 399 })), timing('Search, sort and page 10,000 records', () => tablePage(rows, [{ key: 'amount' }], { query: 'Record 9', sort: 'amount' })), timing(`Restore ${Object.keys(restored).length.toLocaleString('en-US')} compact review records`, () => restoreReviews(compact)), timing(`Compute ${PAGE_VIEWS.length}-view scoped coverage`, () => reviewCoverage(restored, scope))],
};
fs.mkdirSync(path.join(root, '.tmp'), { recursive: true });
fs.writeFileSync(path.join(root, '.tmp/ui-scale-report.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
