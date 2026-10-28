/** Generate a portable UI review handoff from the actual portal/package catalogs. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGES, PAGE_VIEWS, REVIEW_DENSITIES, REVIEW_STATES, demoHref, resolveDemoRoute, reviewTargets } from '../growthtrack-ultimate/src/admin-demo/catalog.js';
import { REVIEW_VERSION } from '../growthtrack-ultimate/src/admin-demo/models/reviewModel.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const impact = JSON.parse(fs.readFileSync(path.join(root, 'docs/plans/ui-impact-analysis.json'), 'utf8'));
const applications = JSON.parse(fs.readFileSync(path.join(root, 'docs/applications.json'), 'utf8'));
const template = fs.readFileSync(path.join(root, 'docs/templates/ui-architecture-handoff.md'), 'utf8').replace(/\r\n/g, '\n');
const verification = fs.readFileSync(path.join(root, 'docs/plans/2026-10-28-verification.md'), 'utf8');
const recordedChecks = Number(verification.match(/`npm run test:design`\s*\|\s*(\d+) checks pass/)?.[1]);
const recordedAvatarChecks = Number(verification.match(/Existing avatar contract subset\s*\|\s*(\d+) tests pass/)?.[1]);
if (!recordedChecks || !recordedAvatarChecks) throw new Error('Verification summary is missing recorded check counts.');
const screenCount = fs.readdirSync(path.join(root, 'growthtrack-ultimate/src/admin-demo/screens')).filter(file => file.endsWith('.jsx')).length;
const baseUrl = 'http://127.0.0.1:5410/admin-demo.html';
// Briefs describe review intent and source-observed limits, not production capability.
const briefs = {
  finance: ['Personal ledger overview, totals and recent transactions.', 'working-demo', 'Shared sample ledger and calculated totals; no financial account API.'],
  transactions: ['Record, search and distinguish income and expenses.', 'working-demo', 'Typed local amounts/dates/categories feed filtered tables and summaries.'],
  financeAnalytics: ['Category spending, income analysis and comparisons.', 'partial-layout', 'Sample ledger summaries work; specialised comparison layouts need review.'],
  financeTrends: ['Monthly spending context and recurring costs.', 'partial-layout', 'Shared ledger and active subscription views; no live trend provider.'],
  budgeting: ['Category limits, current spending and historical budgets.', 'working-demo', 'Current category totals and a distinct historical sample; local category creation.'],
  subscriptions: ['Active, upcoming and archived plans with recurring totals.', 'working-demo', 'Status/date filters and local creation; no billing integration.'],
  portfolio: ['Holdings, sector allocation and portfolio value history.', 'working-demo', 'Distinct sample holdings/allocation/history views; prices and returns are fictional.'],
  sip: ['Illustrative recurring-contribution projection and rate comparison.', 'working-demo', 'Interactive assumptions and distinct tables; not investment advice or guaranteed returns.'],
  shopping: ['Planned/purchased items, amounts, categories and totals.', 'working-demo', 'Typed local item creation and status-specific totals; no checkout.'],
  financeSync: ['Account connections, CSV import and import history.', 'setup-layout', 'Setup proposal; no account connection or CSV persistence is implemented by the demo.'],
  finsync: ['Administer FinSync customers, profiles, activity and support.', 'working-demo', 'Product-scoped fictional directory, sample plans and local notes; real admin adapter planned.'],
  oxfin: ['Administer OxFin customers, profiles, activity and support.', 'working-demo', 'Product-scoped fictional directory, sample plans and local notes; real admin adapter planned.'],
  equity: ['Instruments, market charts, indices and option-chain research.', 'partial-layout', 'Selectable sample market context and distinct tables; no live feed or orders.'],
  overview: ['Workspace summary, priorities, quick entry and navigation.', 'partial-layout', 'Navigation and quick-add work; summary/priority tabs need distinct intent review.'],
  actions: ['Triage today, upcoming, snoozed and dismissed work.', 'working-demo', 'Distinct segments with local 24-hour snooze, dismiss, restore and shared task completion; session-only.'],
  current: ['Weather, news and local context.', 'setup-layout', 'Provider-specific not-connected states; no fabricated live weather, news or location.'],
  analytics: ['Cross-workspace trends, correlations and comparisons.', 'layout-proposal', 'Named input/output contracts replace generic computed-looking charts; no measured analysis.'],
  dashboards: ['Saved dashboards and arrangement workflow.', 'partial-layout', 'Local widget ordering is shared between Saved/Arrange views; widget sources remain sample or not connected.'],
  progress: ['Timeline, comparisons and milestones.', 'layout-proposal', 'Named artifact contracts identify required inputs and intended outputs; no measured personal progress.'],
  forecast: ['Trend/scenario research presentation.', 'layout-proposal', 'Explicit scenario/model contracts; no connected model or personal outcome prediction.'],
  forex: ['Model comparison, pair forecasts, analytics and volatility.', 'partial-layout', 'Selectable sample pairs/periods and model notes; Python inference/training remains separate.'],
  wellness: ['Growth overview, activity, routines and weekly rhythm.', 'partial-layout', 'Sample summary and routine details; not a connected health platform.'],
  sleep: ['Sleep log, trends and history.', 'partial-layout', 'Sample records and charts; real logging/provider persistence is outside the demo.'],
  lifestyle: ['Routines, preferences and history.', 'layout-proposal', 'Shared growth layout; distinct preferences/history workflows need review.'],
  mind: ['Check-ins, journal, trends and breathing exercise.', 'partial-layout', 'Breathing interaction and sample check-ins; journal/trends are not a complete backend workflow.'],
  medical: ['Vitals, medication context, records and timeline.', 'layout-proposal', 'Fictional record layout; no clinical integration, diagnosis or private documents.'],
  health: ['Senses, lifestyle, specialised and recovery context.', 'layout-proposal', 'Shared growth family; domain-specific screens/data need definition.'],
  habits: ['Today matrix and habit history.', 'partial-layout', 'Clickable sample matrix; history and navigation persistence require review.'],
  physique: ['Blueprint, measurements, Goal targets, saved history and model workspace.', 'working-demo', 'Independent Current/Goal drafts, bounded sliders, debounced SVG schematic and explicit local saves; renderer/GLB unavailable.'],
  assessment: ['Questionnaire, assessment results and history.', 'layout-proposal', 'Sample history; no complete questionnaire/scoring workflow in this preview.'],
  training: ['Schedule, session logger, personal records, overload and volume.', 'partial-layout', 'Sample sessions and trend layouts; specialised logger/record workflows need review.'],
  strength: ['Strength log, progression, 1RM, fatigue and volume.', 'partial-layout', 'Sample records/charts; the 1RM tab is not a complete input/result calculator.'],
  nutrition: ['Daily food, history, targets and calculator.', 'partial-layout', 'Sample food/target context; specialised calculator and persistent logging remain incomplete.'],
  hydration: ['Water today, history and targets.', 'partial-layout', 'Local 250 ml increment interaction; history/target consistency and persistence need review.'],
  healthSync: ['Device connections, consented imports and import history.', 'setup-layout', 'Explicit setup state; no live device/import connection.'],
  workspace: ['Work overview and access to tasks, projects, calendar and files.', 'working-demo', 'Navigation and shared local task interactions.'],
  calendar: ['Month, week, agenda and calendar connections.', 'working-demo', 'Valid UTC date keys and shared local/family events; provider connection is setup-only.'],
  documents: ['Vault, providers and recent files.', 'partial-layout', 'Sample metadata/detail views; Providers is explicit setup, with no upload or private file access.'],
  notes: ['All, pinned/tagged notes and editor.', 'working-demo', 'Selection and shared-session note drafts; no server-side note storage.'],
  tasks: ['Today/upcoming/all/completed, list and board workflows.', 'working-demo', 'Local creation/completion and status views; verify every presentation and date filter.'],
  projects: ['Connected GitHub work, personal projects, grid and list.', 'partial-layout', 'Local progress cards and creation; GitHub setup is not a connected repository.'],
  timesheet: ['Focus timer, session history and analytics.', 'working-demo', 'Distinct timer, session table and daily/project analytics from one sample/session history; completion deduplicates even off-page.'],
  skills: ['Skill tree, list, radar and history.', 'partial-layout', 'Skill-specific library, groups, sample practice coverage and history; coverage is not a measured competency score.'],
  goals: ['Active, completed and archived goals.', 'working-demo', 'Local goal/progress samples and meaningful status filtering.'],
  life: ['Family and life overview with module navigation.', 'working-demo', 'Navigation into family, places and library proposals.'],
  social: ['Social profiles, analytics and connections.', 'layout-proposal', 'Sample collection; no connected social account or measured analytics.'],
  entertainment: ['Library, statistics and synchronisation.', 'layout-proposal', 'Sample book/film/music collection; statistics/sync workflows need definition.'],
  maps: ['Saved places, map/list/timeline and privacy.', 'schematic-layout', 'Schematic fictional map; no map provider, precise location or distinct real timeline.'],
  family: ['Tree/members, memories, family vault and timeline/events.', 'working-demo', 'Local unlinked members, shared events and scoped sample files; memories are sample collections and no uploads occur.'],
  hub: ['Administration overview and access to portal modules.', 'partial-layout', 'Native-module/admin launch cards; not live product orchestration.'],
  apps: ['Modules, favourites and external applications.', 'layout-proposal', 'Module cards; tab-specific favourites/external behaviour needs review.'],
  companion: ['Connected product discovery and product-specific contexts.', 'layout-proposal', 'Module/admin launch cards; product-specific views are not equivalent to embedded customer apps.'],
  ai: ['Optional assistant chat, history, context and configuration.', 'setup-layout', 'Optional tools/setup proposal; no assistant provider is required or connected.'],
  databases: ['Custom/application data-source connections and imports.', 'setup-layout', 'Setup proposal; no private database query or import service in the demo.'],
  profile: ['Personal/physical profile, security, appearance and integrations.', 'partial-layout', 'Theme and density preferences work locally; security/integration/profile data are conceptual samples.'],
  notifications: ['Unread/all notifications and preferences.', 'working-demo', 'Session mark-read/unread/all actions, preference controls and an unread-aware header indicator.'],
  help: ['Guides, troubleshooting and diagnostics.', 'layout-proposal', 'Guide/navigation layout; no complete diagnostics or support backend.'],
  logs: ['Activity, authentication and sync audit context.', 'working-demo', 'Distinct read-only sample event schemas; authentication creates no session and sync attempts are not fabricated.'],
  about: ['Version, capabilities and licences.', 'layout-proposal', 'Informational/guide family; verify content matches the chosen tab and actual shipped capabilities.'],
  pricing: ['Capabilities and billing concepts.', 'layout-proposal', 'Concept plans only; no settled pricing, billing or checkout is connected.'],
  customers: ['Unified FinSync/OxFin customer administration.', 'working-demo', 'Fictional directory, local customer/profile/plan/note workflows with product scoping.'],
  welcome: ['Public introduction and entry to the sample workspace.', 'public-layout', 'Interactive navigation and illustrative workspace preview.'],
  login: ['Sign-in page composition and post-sign-in layout.', 'public-layout', 'Read-only sample account and preview result; no password collection or real session.'],
  privacy: ['Privacy-policy typography and reading layout.', 'public-layout', 'Policy structure proposal only; not an approved/published legal policy.'],
  terms: ['Terms typography and reading layout.', 'public-layout', 'Policy structure proposal only; no legal agreement is collected.'],
};

const encodePath = file => encodeURI(path.relative(path.join(root, 'docs'), path.join(root, file)).replaceAll('\\', '/'));
const cell = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
const pages = PAGES.map(page => {
  if (!Object.hasOwn(briefs, page.id)) throw new Error('Missing feature brief: ' + page.id);
  const reach = impact.routes.find(route => route.id === page.id);
  if (!reach) throw new Error('Impact map missing page: ' + page.id);
  const [featureIntent, previewLevel, currentCoverage] = briefs[page.id];
  return { id: page.id, title: page.title, path: page.path, area: page.area, ownerArea: reach.ownerArea, views: page.views.length ? page.views : [''], featureIntent, previewLevel, currentCoverage, screenFamily: reach.family, entry: reach.entry, styleGroups: ['shared', ...(page.id === 'physique' ? ['physique'] : [])], initialReviewStatus: 'not-tested' };
});
if (Object.keys(briefs).length !== pages.length) throw new Error('Orphaned feature brief; update the handoff catalog.');
const destinations = PAGE_VIEWS.map(({ page, view }) => ({ pageId: page.id, view, demoUrl: baseUrl + demoHref(page.id, view), initialReviewStatus: 'not-tested' }));
for (const target of destinations) {
  const result = resolveDemoRoute(target.demoUrl.slice(baseUrl.length));
  if (result.page.id !== target.pageId || result.view !== target.view) throw new Error('Route failed to round trip: ' + target.demoUrl);
}
const batches = impact.owners.map((owner, index) => ({ id: `B${String(index + 1).padStart(2, '0')}`, ownerArea: owner.ownerArea, pages: owner.pages, destinations: destinations.filter(target => owner.pages.includes(target.pageId)).length, productionGate: owner.productionGate }));
const tasks = template.split('\n').filter(line => /^\| [DRIVT]\d{2} \|/.test(line)).map(line => {
  const [id, task, ownerArea, dependsOn, acceptance] = line.split('|').slice(1, -1).map(value => value.trim());
  return { id, task, ownerArea, dependsOn, acceptance, status: id.startsWith('D') ? 'delivered-supporting-work' : id === 'I01' ? 'implemented-in-source-rendered-verification-pending' : id === 'R13' ? 'direction-approved-rendered-ledger-pending' : id.startsWith('R') ? 'pending-review' : id.startsWith('T') ? 'optional-planned-tooling' : 'planned-after-relevant-gates' };
});
const counts = { pages: pages.length, pageViewDestinations: destinations.length, lazyRouteFamilies: impact.counts.lazyRouteFamilies, screenComponents: screenCount, sourceStylesheetsInventoried: impact.counts.sourceStylesheetsInventoried, ownershipBatches: batches.length, applicationPackages: applications.length, workPackages: tasks.length, reviewStates: REVIEW_STATES.length, baseReviewVariants: reviewTargets().length, plannedViewportVariants: reviewTargets().length * impact.viewportMatrix.length };
const manifest = {
  schemaVersion: 1, preparedOn: '2026-10-28',
  purpose: 'Portable planning/source manifest for independent UI review. Initial statuses are untested planning values, not imported user approvals or browser observations.',
  counts,
  sourceOfTruth: ['AGENTS.md', 'growthtrack-ultimate/src/config/featureRegistry.ts', 'growthtrack-ultimate/src/admin-demo/catalog.js', 'growthtrack-ultimate/src/admin-demo/screenRegistry.js', 'docs/applications.json', 'docs/plans/ui-impact-analysis.json'],
  detailedImportGraph: 'docs/plans/ui-impact-analysis.json',
  productionUiIntegration: impact.productionUiIntegration,
  sharedReviewSources: ['growthtrack-ultimate/src/admin-demo/AdminDemo.jsx', 'growthtrack-ultimate/src/admin-demo/components.jsx', 'growthtrack-ultimate/src/admin-demo/screens.jsx', 'growthtrack-ultimate/src/admin-demo/Scope.jsx', 'growthtrack-ultimate/src/admin-demo/PreviewState.jsx', 'growthtrack-ultimate/src/admin-demo/models/screenScope.js', 'growthtrack-ultimate/src/admin-demo/models/reviewModel.js', 'growthtrack-ultimate/src/admin-demo/models/tableModel.js', 'growthtrack-ultimate/src/admin-demo/dialogs/ReviewCatalog.jsx'],
  styleGroups: { shared: ['growthtrack-ultimate/src/admin-demo/styles/tokens.css', 'growthtrack-ultimate/src/admin-demo/portal.css', 'growthtrack-ultimate/src/admin-demo/styles/proposal.css', 'growthtrack-ultimate/src/admin-demo/styles/workspaces.css'], physique: ['growthtrack-ultimate/src/admin-demo/styles/physique.css'] },
  preview: { command: 'npm run dev:design', baseUrl, data: 'fictional', credentialCollection: false, productApisConnected: false, physiqueRenderer: 'schematic SVG; production 3D not connected' },
  reviewDimensions: { version: REVIEW_VERSION, themes: ['light', 'dark'], densities: REVIEW_DENSITIES, states: REVIEW_STATES, viewports: impact.viewportMatrix, additionalCases: ['200% zoom', 'Long text and numeric values', 'Keyboard and focus', 'Reduced motion and forced colours', 'Storage denied/corrupt/full', 'Back/Forward and direct routes', 'Rapid edits and navigation persistence', 'Provider/permission/conflict states during production integration'] },
  productRules: [
    'Ultimate is the desktop portal; Equity, Family and Forex move toward native portal modules.',
    'FinSync and OxFin remain separate customer products; only their customer-admin presentation belongs in Ultimate.',
    'Customer-product sessions are not admin credentials; real access needs product/tenant permissions and audit.',
    'Domain data and release ownership remain separate; frontend layout does not grant backend access.',
    'Production UI promotion requires the user review for affected scopes.',
    'Optional agents/embeddings are not product runtime requirements; keep source retrieval local and ignored.',
  ],
  ownerBatches: batches,
  pages,
  destinations,
  applications: applications.map(app => ({ path: app.path, title: app.title, purpose: app.purpose, runtime: app.runtime, recordedStatus: app.status, readme: path.posix.join(app.path, 'README.md') })),
  workPackages: tasks,
  reviewOutput: { statuses: ['not-tested', 'reviewed-no-finding', 'changes-requested', 'blocked'], requiredFindingFields: ['id', 'severity', 'pageId', 'view', 'theme', 'density', 'state', 'viewport', 'reviewType', 'summary', 'steps', 'observed', 'expected', 'evidence', 'sourceCandidates', 'affectedPages', 'recommendation', 'verification'], severity: ['P0', 'P1', 'P2', 'P3'], approvalAuthority: 'User approval is separate from a review recommendation.' },
  baselineEvidence: { status: 'last recorded local verification; see source for the current run and preserved separate baseline results', uiChecksPassed: recordedChecks, routeThemeDensityRenderChecks: PAGE_VIEWS.length * 2 * REVIEW_DENSITIES.length, separateAvatarContractChecksPassed: recordedAvatarChecks, browserVisualSignoff: 'pending', source: 'docs/plans/2026-10-28-verification.md' },
};

const pageTable = ['| Page / ID | Demo route | Tabs | Feature intent | Preview level and current coverage |', '| --- | --- | --- | --- | --- |', ...pages.map(page => `| ${cell(page.title)} / \`${page.id}\` | [\`${page.path}\`](${baseUrl + demoHref(page.id, page.views[0])}) | ${page.views.map(view => '\`' + (view || 'default') + '\`').join(', ')} | ${cell(page.featureIntent)} | **${page.previewLevel}**: ${cell(page.currentCoverage)} |`)].join('\n');
const packageTable = ['| Application/reference package | Location / README | Purpose | Recorded status |', '| --- | --- | --- | --- |', ...applications.map(app => `| ${cell(app.title)} | [${cell(app.path === '.' ? 'Workspace root' : app.path)}](${encodePath(path.join(app.path, 'README.md'))}) | ${cell(app.purpose)} | ${cell(app.status)} |`)].join('\n');
const batchTable = ['| Batch | Ownership area | Pages / destinations | Page IDs |', '| --- | --- | --- | --- |', ...batches.map(batch => `| ${batch.id} | ${cell(batch.ownerArea)} | ${batch.pages.length} / ${batch.destinations} | ${batch.pages.map(id => '\`' + id + '\`').join(', ')} |`)].join('\n');
let markdown = template;
for (const [name, value] of Object.entries({ PAGE_COUNT: counts.pages, DESTINATION_COUNT: counts.pageViewDestinations, FAMILY_COUNT: counts.lazyRouteFamilies, STYLE_COUNT: counts.sourceStylesheetsInventoried, SCREEN_COUNT: counts.screenComponents, STATE_COUNT: counts.reviewStates, BASE_REVIEW_VARIANTS: counts.baseReviewVariants.toLocaleString('en-US'), VIEWPORT_VARIANTS: counts.plannedViewportVariants.toLocaleString('en-US'), UI_CHECKS: recordedChecks, RENDER_CHECKS: manifest.baselineEvidence.routeThemeDensityRenderChecks, AVATAR_CHECKS: recordedAvatarChecks })) markdown = markdown.replaceAll('{{' + name + '}}', String(value));
if (/\{\{[A-Z_]+\}\}/.test(markdown)) throw new Error('Unresolved handoff count marker.');
for (const [marker, content] of [['<!-- GENERATED_PAGE_CATALOG -->', pageTable], ['<!-- GENERATED_APPLICATION_CATALOG -->', packageTable], ['<!-- GENERATED_OWNER_BATCHES -->', batchTable]]) {
  if (markdown.split(marker).length !== 2) throw new Error('Expected exactly one template marker: ' + marker);
  markdown = markdown.replace(marker, content);
}
for (const page of pages) for (const file of [page.entry, ...page.styleGroups.flatMap(group => manifest.styleGroups[group])]) if (!fs.existsSync(path.join(root, file))) throw new Error('Missing review source: ' + file);
if (new Set(tasks.map(task => task.id)).size !== tasks.length) throw new Error('Duplicate work package IDs.');
if (new Set(batches.flatMap(batch => batch.pages)).size !== pages.length || batches.reduce((sum, batch) => sum + batch.destinations, 0) !== destinations.length) throw new Error('Incomplete ownership batch coverage.');
for (const match of markdown.matchAll(/\]\(([^)]+)\)/g)) {
  const target = match[1];
  if (/^(?:https?:|#)/.test(target)) continue;
  const file = path.resolve(root, 'docs', decodeURI(target.split('#')[0]));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) throw new Error('Broken or external local handoff link: ' + target);
}
if (markdown.includes('<!-- GENERATED_')) throw new Error('Unresolved generated appendix.');
if ((markdown.match(/^```/gm) || []).length % 2) throw new Error('Unclosed Markdown fence.');
for (const [relative, content] of Object.entries({ 'docs/UI_ARCHITECTURE_HANDOFF.md': markdown, 'docs/ui-review-manifest.json': JSON.stringify(manifest, null, 2) + '\n' })) {
  const file = path.join(root, relative);
  if (check) { if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n') !== content) throw new Error('Handoff drift: ' + relative); }
  else fs.writeFileSync(file, content);
}
console.log(JSON.stringify({ status: check ? 'verified' : 'generated', ...counts, browserVisualSignoff: 'pending' }));
