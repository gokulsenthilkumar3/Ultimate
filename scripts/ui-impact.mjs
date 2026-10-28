/** Static change-impact map. No application service, credentials, or source upload. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGES, PAGE_VIEWS, reviewTargets } from '../growthtrack-ultimate/src/admin-demo/catalog.js';
import { resolveScreenKey, screenLoaders } from '../growthtrack-ultimate/src/admin-demo/screenRegistry.js';
import { FEATURES } from '../growthtrack-ultimate/src/config/featureRegistry.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const previewRoot = 'growthtrack-ultimate/src/admin-demo/';
const normalize = file => path.relative(root, file).replaceAll('\\', '/');
const resolveLocal = (from, specifier) => {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(root, path.dirname(from), specifier);
  for (const candidate of [base, ...['.js', '.jsx', '.ts', '.tsx', '/index.js'].map(extension => base + extension)]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return normalize(candidate);
  }
  throw new Error(`Unresolved local import in ${from}: ${specifier}`);
};
const cache = new Map();
function moduleInfo(file) {
  if (cache.has(file)) return cache.get(file);
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  const imports = [...source.matchAll(/(?:\bfrom\s*|\bimport\s*\()\s*['"]([^'"]+)['"]/g)].map(match => resolveLocal(file, match[1])).filter(Boolean);
  const info = { imports, tableConsumer: /import\s*\{[^}]*\bRecordsTable\b[^}]*\}\s*from\s*['"][^'"]*components['"]/.test(source) };
  cache.set(file, info); return info;
}
function closure(file, visited = new Set()) {
  if (visited.has(file)) return visited;
  visited.add(file);
  for (const dependency of moduleInfo(file).imports) closure(dependency, visited);
  return visited;
}
const ownership = { customers: 'Customer administration', finance: 'Personal finance and markets', wellness: 'Growth and Physique', workspace: 'Workspace', insights: 'Insights', life: 'Family and life', hub: 'Portal platform', public: 'Portal platform' };
const routes = PAGES.map(page => {
  const family = resolveScreenKey(page);
  const specifier = screenLoaders[family].toString().match(/import\(['"]([^'"]+)['"]\)/)?.[1];
  if (!specifier) throw new Error(`Cannot resolve screen loader ${family}`);
  const entry = resolveLocal(previewRoot + 'screenRegistry.js', specifier);
  const modules = [...closure(entry)].sort();
  return { id: page.id, path: page.path, ownerArea: ownership[page.area], family, entry, views: page.views.length ? page.views : [''], sharedTablePotentialImpact: modules.some(file => moduleInfo(file).tableConsumer), sourceModules: modules };
});
const tableRoutes = routes.filter(route => route.sharedTablePotentialImpact);
const viewportMatrix = [{ width: 1024, height: 768 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 390, height: 844 }];
const cssInventory = JSON.parse(fs.readFileSync(path.join(root, 'docs/plans/css-migration-inventory.json'), 'utf8'));
const scenarioGroups = [
  { area: 'Shared records', tests: 'growthtrack-ultimate/src/admin-demo/ui-system.test.jsx', cases: ['10,000 records with 25 mounted rows', '100-row maximum selectable page', 'Sort before slicing', 'Search and reset while on another page', 'Source shrink clamps page', 'Last partial page and empty results', 'Missing sort values stay last'] },
  { area: 'Review workflow', tests: 'growthtrack-ultimate/src/admin-demo/ui-system.test.jsx', cases: [`${(reviewTargets().length * viewportMatrix.length).toLocaleString('en-US')} synthetic scoped review records`, 'Density, theme, state and viewport isolation', 'One tab is not a completed page', 'Pending view selection and wraparound', 'Product and status filters with reset', 'Preserve error state during catalog navigation', 'Resize while writing feedback', 'Malformed and old stored approval rejection'] },
  { area: 'Physique controls', tests: 'growthtrack-ultimate/src/admin-demo/ui-system.test.jsx', cases: ['Current and Goal isolation', 'Finite values and control limits', 'Rapid changes use the newest outline', 'Draft survives tabs and navigation', 'Saved history stays separate from draft', 'Only explicit saves survive reload', 'Storage failure retains draft', 'Malformed profile recovery', 'No service or model requests', 'GLB export unavailable without a connected pipeline'] },
  { area: 'Existing product interactions', tests: 'growthtrack-ultimate/src/admin-demo/ui-records.test.jsx and ui-regressions.test.jsx', cases: ['FinSync and OxFin directory isolation', 'Customer notes and keyboard tabs', 'Financial totals and status filters', 'Family vault ownership and shared events', 'Calendar boundaries and leap years', 'Timer navigation and delayed ticks', 'Dialogs, drawer, focus and empty states'] },
  { area: 'Supplied redesign proposal', tests: 'growthtrack-ultimate/src/admin-demo/proposal-redesign.test.jsx', cases: ['Scope badges and per-panel provenance', 'Denied and unavailable previews', 'Customer plan/status filters and inline detail focus', 'Filtered finance totals, date range recovery and price precision', 'Distinct timer/session/analytics artifacts and exactly-once completion off-page', 'Snooze/dismiss/restore and stable task identity', 'Unread/read transitions and distinct log schemas', 'Honest specialised artifact contracts and skill-specific samples', 'Local dashboard arrangement', 'Global task and edited-note search', 'Public shell and account preferences'] },
];
const report = {
  schemaVersion: 1,
  scope: 'Static dependency and ownership analysis for the isolated redesign. Potential impact is conservative at route-family level, not a claim that every branch changed.',
  implementationScope: 'The import graph below describes the isolated preview. Approved production shell/customer-admin presentation integration is recorded separately in productionUiIntegration; no deployment or database migration.',
  productionUiIntegration: { status: 'Approved demo direction applied to production shell and shared primitives; no deployment', source: 'docs/plans/2026-10-28-production-ui.md', featureRoutes: FEATURES.length, authentication: 'Existing Ultimate owner session and domain stores retained', customerAdmin: 'Dedicated product-scoped UI; authenticated readiness endpoint returns setup until real restricted adapters exist', nativeCompanions: 'Equity/Family/Forex retain existing integration until parity; no fixture substitution', sharedSources: ['growthtrack-ultimate/src/design/tokens.ts', 'growthtrack-ultimate/src/styles/app-styles.css', 'growthtrack-ultimate/src/styles/editorial-shell.css', 'growthtrack-ultimate/src/styles/responsive-foundation.css', 'growthtrack-ultimate/src/components/PremiumSidebar.jsx', 'growthtrack-ultimate/src/components/Header.jsx', 'growthtrack-ultimate/src/components/ui/DataTable.tsx', 'growthtrack-ultimate/src/domains/customer-admin/CustomerAdminPage.jsx', 'growthtrack-ultimate/src/domains/customer-admin/customerAdminClient.js', 'growthtrack-ultimate/server/domains/customerAdmin.js'], browserVerification: 'pending' },
  counts: { pages: routes.length, pageViewDestinations: PAGE_VIEWS.length, lazyRouteFamilies: Object.keys(screenLoaders).length, baseReviewVariants: reviewTargets().length, plannedViewportVariants: reviewTargets().length * viewportMatrix.length, sourceStylesheetsInventoried: cssInventory.count, tablePotentialPages: tableRoutes.length, tablePotentialViews: tableRoutes.reduce((sum, route) => sum + route.views.length, 0) },
  viewportMatrix,
  owners: Object.values(ownership).filter((value, index, array) => array.indexOf(value) === index).map(owner => ({ ownerArea: owner, pages: routes.filter(route => route.ownerArea === owner).map(route => route.id), productionGate: owner === 'Customer administration' ? 'Authenticated product-specific adapters, roles, audit and rendered verification; design direction is approved' : 'Rendered verification, domain integration and affected application build; design direction is approved' })),
  changes: [
    { surface: 'Shell, review and shared styling', potentialPages: routes.map(route => route.id), risk: 'Incorrect scope could overstate approval; fixed toolbar and long labels need actual viewport inspection.', control: 'v5 exact-scope keys, six preview states, explicit provenance, canonical accessible tokens, linear scoped coverage and frozen feedback target.' },
    { surface: 'Shared RecordsTable', potentialPages: tableRoutes.map(route => route.id), risk: 'Unbounded rows, empty pages after filtering, incorrect global sorting.', control: '25 rows by default, 100 maximum, full-result sorting before slicing, search resets page, clamp after source shrink. This is client pagination, not server pagination.' },
    { surface: 'Physique workspace', potentialPages: ['physique'], risk: 'Current/Goal leakage, draft overwrite, stale preview, implying a completed mesh or fit.', control: 'Independent semantic contexts, explicit local snapshot, cancel obsolete outline timer, isolated lazy screen, disabled GLB export.' },
    { surface: 'Customer master/detail', potentialPages: ['customers', 'finsync', 'oxfin'], risk: 'Product leakage, filtered-out selection, duplicate tab identifiers and narrow detail columns.', control: 'Product/status/plan filtering, selection reset, unique tab IDs, focus restoration and stacked detail below 1296px; no real admin writes.' },
    { surface: 'Shared session workflows', potentialPages: ['actions', 'tasks', 'workspace', 'timesheet', 'notes', 'notifications', 'logs'], risk: 'Duplicate completion, title-key collisions, state loss between views and invented audit streams.', control: 'Stable task/session IDs, deadline completion deduplication, shell-owned state, distinct read-only sample schemas and current-draft search.' },
    { surface: 'Concept analytics and specialised workflows', potentialPages: ['current', 'analytics', 'dashboards', 'progress', 'forecast', 'assessment', 'strength', 'nutrition', 'training', 'skills'], risk: 'Generic repeated charts could be mistaken for implemented analysis or completed calculators.', control: 'Named input/output artifact contracts, explicit setup/preview scope, skill-specific records and labelled local dashboard ordering.' },
  ],
  diagramAssessment: [
    { stage: 'Semantic state and save', evidence: ['growthtrack-ultimate/src/lib/avatarDocument.js', 'growthtrack-ultimate/src/hooks/useParametricAvatar.js'], observed: 'Versioned semantic documents and an existing per-person serialized save boundary. Demo state stays independent of these production stores.' },
    { stage: 'Identity bake worker', evidence: ['growthtrack-ultimate/src/components/morphEngine/parametricIdentity.js'], observed: 'The inspected identity module evaluates on the CPU through synchronous setWeights. The worker box in the supplied diagram is a target, not an established worker in this module.' },
    { stage: 'Garment solver worker', evidence: ['growthtrack-ultimate/src/components/morphEngine/garmentFitQueue.js', 'growthtrack-ultimate/src/components/morphEngine/garmentFit.worker.js'], observed: 'Existing single-flight, newest-revision queue and worker. Stale results cannot apply; failure and disposal reject waiting exports.' },
    { stage: 'Renderer and portable export', evidence: ['growthtrack-ultimate/src/components/morphEngine/avatarPackage.js', 'growthtrack-ultimate/src/lib/avatarDocument.js'], observed: 'Production semantic documents and geometry packages have distinct contracts. The review demo exports only clearly labelled sample JSON and does not instantiate the renderer.' },
  ],
  scenarioGroups,
  browserCasesStillRequired: ['Actual layout at all five viewport sizes', 'Both themes and densities with zoom and long text', 'Native dialog focus, backdrop, scroll lock and drawer', 'Range keyboard and pointer interactions', 'Reduced-motion and forced-colour appearance', 'Real WebGL context loss, device memory and fitted garment rendering after integration'],
  productionGates: ['No shared customer authorization through product login handoff', 'Bounded server pagination before real large datasets', 'Identity-worker revision and cancellation contract before moving CPU evaluation', 'Owned transferable buffers; no detachment of live geometry', 'Export only the latest fitted and matching document revision', 'Save flush, owner/person change and offline error recovery', 'Independent builds for affected applications; no coupled all-product release'],
  routes,
};
const output = path.join(root, 'docs/plans/ui-impact-analysis.json');
const content = JSON.stringify(report, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8').replace(/\r\n/g, '\n') !== content) throw new Error('UI impact map drift. Run npm run impact:ui.');
} else fs.writeFileSync(output, content);
console.log(JSON.stringify({ ...report.counts, status: process.argv.includes('--check') ? 'verified' : 'generated', browserVerification: 'pending' }));
