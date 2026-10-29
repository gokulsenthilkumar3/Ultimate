// Measure the production build, never the owner's backend. All API responses
// belong to this loopback-only fixture; external services/frames are blocked.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { chromium } from '@playwright/test';
import { registerFrontend } from '../server/frontend.js';
import { FEATURES } from '../src/config/featureRegistry.ts';
import { OWNER } from '../tests/e2e/foundation-fixture.ts';
import { performanceFixture } from './performance-fixture.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const args = process.argv.slice(2);
const option = (name, fallback) => args.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const label = option('label', 'current');
if (!/^[a-z0-9-]+$/i.test(label)) throw new Error('Use an alphanumeric report label.');
const runs = Number(option('runs', '3'));
const delay = Number(option('state-delay', '150'));
if (!Number.isInteger(runs) || runs < 1 || runs > 10 || !Number.isFinite(delay) || delay < 0 || delay > 5000) throw new Error('Invalid measurement options.');
const selected = option('pages', '').split(',').filter(Boolean);
const fixtureName = option('fixture', 'empty');
const fixture = performanceFixture(fixtureName);
const countFormatters = !args.includes('--no-format-counters');
const profileCpu = args.includes('--cpu-profile');
const output = path.resolve(root, '../.gstack/benchmark-reports');
await mkdir(output, { recursive: true });
if (args.includes('--screenshots')) await mkdir(path.join(output, 'screenshots', label), { recursive: true });
const manifest = JSON.parse(await readFile(path.join(dist, '.vite/manifest.json'), 'utf8'));
const appSource = await readFile(path.join(root, 'src/App.jsx'), 'utf8');
const names = Object.fromEntries([...appSource.matchAll(/(\w+):\s*lazy\(\(\) => import\('\.\/(.*?)'\)\)/g)].map(match => [match[1], match[2]]));
const finance = new Set(['finance', 'transactions', 'financeAnalytics', 'financeTrends', 'budgeting', 'subscriptions', 'financeSync']);
const insights = new Set(['analytics', 'dashboards', 'forecast', 'progress']);
function moduleKey(id) {
  const name = finance.has(id) ? 'components/Finance' : insights.has(id) ? 'components/InsightsHub'
    : ['customers', 'finsync', 'oxfin'].includes(id) ? 'domains/customer-admin/CustomerAdminPage' : names[id];
  return name && Object.keys(manifest).find(key => key.replace(/\.(?:jsx?|tsx?)$/, '') === `src/${name}`);
}
const pages = [
  ...FEATURES.map(feature => ({ id: feature.id, path: feature.canonicalPath, module: moduleKey(feature.id) })),
  ...['login', 'welcome', 'privacy', 'terms'].map(id => ({ id, path: `/${id}`, public: true })),
].filter(page => !selected.length || selected.includes(page.id));
if (!pages.length || selected.some(id => !pages.some(page => page.id === id))) throw new Error('Unknown page selection.');

const frontend = express();
registerFrontend(frontend, { distDirectory: dist, frontendBasePath: '/Ultimate/' });
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store');
      let data;
      if (url.pathname === '/api/auth/me') {
        if (req.headers['x-performance-anonymous'] === '1') { res.statusCode = 401; data = { error: 'Isolated signed-out browser' }; }
        else data = { user: OWNER, expiresAt: '2099-01-01T00:00:00.000Z' };
      }
      else if (url.pathname.includes('csrf')) data = { csrfToken: 'isolated-test-csrf' };
      else if (url.pathname === '/api/state') { await new Promise(resolve => setTimeout(resolve, delay)); data = fixture.state; }
      else if (url.pathname === '/api/health') data = { status: 'ok' };
      else if (url.pathname === '/api/capabilities') data = { version: 'performance-fixture', billing: { checkoutAvailable: false, tier: null }, connections: [] };
      else if (url.pathname === '/api/agents/readiness') data = { ready: false, code: 'setup_required', models: [] };
      else if (url.pathname.startsWith('/api/habit_logs/')) data = fixture.habitLogs[url.pathname.split('/').at(-1)] || [];
      else if (fixtureName === 'populated' && ['/api/notes', '/api/goals', '/api/tasks', '/api/documents', '/api/subscriptions', '/api/finance', '/api/timesheet'].includes(url.pathname)) data = fixture.state[url.pathname.slice(5)] || [];
      else if (fixtureName === 'populated' && url.pathname === '/api/portfolio') data = fixture.state.user.portfolio;
      else if (['/api/notifications', '/api/locations', '/api/documents', '/api/notes', '/api/goals', '/api/tasks', '/api/timesheet', '/api/finance', '/api/subscriptions', '/api/budgets', '/api/integrations/providers', '/api/custom-tables', '/api/database/tables', '/api/portfolio'].includes(url.pathname)) data = [];
      else if (url.pathname === '/api/logs' && req.method === 'POST') data = { success: true };
      else { res.statusCode = 503; data = { code: url.pathname.startsWith('/api/admin/products/') ? 'ADMIN_ADAPTER_NOT_CONFIGURED' : 'TEST_SERVICE_UNAVAILABLE', error: 'Optional service unavailable in the isolated performance fixture.' }; }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return;
    }
    frontend(req, res);
  } catch { res.writeHead(404); res.end(); }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const results = [];
const median = values => { const sorted = values.filter(value => value != null).sort((a, b) => a - b); return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null; };
try {
  browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  for (const pageInfo of pages) {
    const samples = [];
    for (let run = 0; run < runs; run++) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block', extraHTTPHeaders: pageInfo.public ? { 'x-performance-anonymous': '1' } : {} });
      try {
        await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
        await context.addInitScript(({ countFormatters }) => {
          localStorage.setItem('growthtrack-analytics-consent', 'denied');
          window.__pagePerf = { lcp: null, cls: 0, blocking: 0, ready: null, numberFormats: 0, dateFormats: 0, initStarted: performance.now() };
          for (const [name, counter] of countFormatters ? [['NumberFormat', 'numberFormats'], ['DateTimeFormat', 'dateFormats']] : []) {
            Intl[name] = new Proxy(Intl[name], { construct(target, args, receiver) {
              window.__pagePerf[counter] += 1;
              return Reflect.construct(target, args, receiver);
            } });
          }
          window.__pagePerf.initEnded = performance.now();
          for (const type of ['largest-contentful-paint', 'layout-shift', 'longtask']) {
            new PerformanceObserver(list => { for (const entry of list.getEntries()) {
              if (type === 'largest-contentful-paint') window.__pagePerf.lcp = entry.startTime;
              if (type === 'layout-shift' && !entry.hadRecentInput) window.__pagePerf.cls += entry.value;
              if (type === 'longtask') window.__pagePerf.blocking += Math.max(0, entry.duration - 50);
            } }).observe({ type, buffered: true });
          }
          new MutationObserver(() => {
            if (window.__pagePerf.ready == null && document.querySelector('#main-content h1, #main-content h2, .gt-public h1')) window.__pagePerf.ready = performance.now();
          }).observe(document, { childList: true, subtree: true });
        }, { countFormatters });
        const page = await context.newPage();
        const profiler = profileCpu && await context.newCDPSession(page);
        if (profiler) { await profiler.send('Profiler.enable'); await profiler.send('Profiler.start'); }
        const pending = new Set();
        const childDocuments = [];
        let stateRequests = 0;
        let lastRequestChange = Date.now();
        page.on('request', request => {
          const url = new URL(request.url());
          if (url.pathname === '/api/state') stateRequests++;
          if (request.isNavigationRequest() && request.frame().parentFrame()) childDocuments.push(url.pathname);
          // Service hosts deliberately poll health while unavailable. They are
          // not outstanding startup work and must not prevent collection.
          if (url.origin !== origin || /\/health(?:\/|$)/.test(url.pathname)) return;
          pending.add(request); lastRequestChange = Date.now();
        });
        const finished = request => { if (pending.delete(request)) lastRequestChange = Date.now(); };
        page.on('requestfinished', finished); page.on('requestfailed', finished);
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(origin + '/Ultimate' + pageInfo.path, { waitUntil: 'load', timeout: 20000 });
        let failure = null;
        try { await page.waitForFunction(() => document.querySelector('#main-content h1, #main-content h2, h1') && !document.querySelector('#main-content .app-loading-skeleton'), null, { timeout: 8000 }); }
        catch { failure = 'No page heading rendered within 8s'; }
        if (fixtureName === 'populated') {
          const deadline = Date.now() + 12000;
          while (Date.now() < deadline && (pending.size || Date.now() - lastRequestChange < 200)) await page.waitForTimeout(50);
          if (pending.size) failure ||= 'Startup requests did not settle within 12s';
        }
        // Collect post-render paints and pending startup work consistently.
        await page.waitForTimeout(350);
        const metrics = await page.evaluate(({ countFormatters }) => {
          const nav = performance.getEntriesByType('navigation')[0];
          const resources = performance.getEntriesByType('resource');
          const sum = filter => resources.filter(filter).reduce((total, entry) => total + entry.decodedBodySize, 0);
          const state = resources.find(entry => new URL(entry.name).pathname === '/api/state');
          return {
            ttfb: nav.responseStart - nav.requestStart,
            fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
            lcp: window.__pagePerf.lcp, cls: window.__pagePerf.cls, blocking: window.__pagePerf.blocking,
            ready: window.__pagePerf.ready, load: nav.loadEventEnd,
            navigation: nav.toJSON(), initStarted: window.__pagePerf.initStarted, initEnded: window.__pagePerf.initEnded,
            numberFormats: countFormatters ? window.__pagePerf.numberFormats : null, dateFormats: countFormatters ? window.__pagePerf.dateFormats : null,
            domNodes: document.querySelectorAll('#main-content *').length,
            jsBytes: sum(entry => new URL(entry.name).pathname.endsWith('.js')),
            cssBytes: sum(entry => new URL(entry.name).pathname.endsWith('.css')),
            transferBytes: resources.reduce((total, entry) => total + entry.transferSize, 0), requests: resources.length,
            stateEnd: state?.responseEnd ?? null,
            resources: resources.map(entry => ({ file: new URL(entry.name).pathname.split('/').pop(), start: entry.startTime, end: entry.responseEnd, bytes: entry.decodedBodySize })),
            shell: document.querySelector('.app-shell')?.getAttribute('data-active-tab') ?? null,
            componentError: document.querySelector('#main-content')?.textContent?.includes('This page could not load') || false,
          };
        }, { countFormatters });
        const moduleFile = pageInfo.module && path.basename(manifest[pageInfo.module].file);
        metrics.moduleStart = metrics.resources.find(resource => resource.file === moduleFile)?.start ?? null;
        if (profiler) {
          const { profile } = await profiler.send('Profiler.stop');
          await writeFile(path.join(output, `${label}-${pageInfo.id}-${run}.cpuprofile`), JSON.stringify(profile));
          await profiler.detach();
        }
        const rendered = pageInfo.public || metrics.shell === pageInfo.id;
        if (run === 0 && args.includes('--screenshots')) await page.screenshot({ path: path.join(output, 'screenshots', label, `${pageInfo.id}.png`) });
        samples.push({ ...metrics, stateRequests, childDocuments, pendingRequests: [...pending].map(request => ({ path: new URL(request.url()).pathname, method: request.method(), type: request.resourceType() })), failure: failure || (metrics.componentError ? 'Component error boundary rendered' : !rendered ? 'Unexpected route or authentication wall' : null), errors });
        const sample = samples.at(-1);
        if (sample.failure || errors.length) console.warn(JSON.stringify({ page: pageInfo.id, run: run + 1, failure: sample.failure, errors, pendingRequests: sample.pendingRequests }));
      } finally { await context.close(); }
    }
    const metrics = Object.fromEntries(['ttfb', 'fcp', 'lcp', 'cls', 'blocking', 'ready', 'load', 'jsBytes', 'cssBytes', 'transferBytes', 'requests', 'stateEnd', 'moduleStart', 'numberFormats', 'dateFormats', 'domNodes'].map(key => [key, median(samples.map(sample => sample[key]))]));
    results.push({ ...pageInfo, metrics, failures: [...new Set(samples.flatMap(sample => [sample.failure, ...sample.errors]).filter(Boolean))], samples });
    console.log(`${pageInfo.id}: ready=${Math.round(metrics.ready || 0)}ms blocking=${Math.round(metrics.blocking)}ms nodes=${metrics.domNodes} formats=${metrics.numberFormats} JS=${Math.round(metrics.jsBytes / 1000)}KB${results.at(-1).failures.length ? ` FAILED: ${results.at(-1).failures.join('; ')}` : ''}`);
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

const closure = (key, seen = new Set()) => { if (seen.has(key)) return seen; seen.add(key); for (const dependency of manifest[key]?.imports || []) closure(dependency, seen); return seen; };
const entryFiles = [...closure('index.html')].flatMap(key => [manifest[key].file, ...(manifest[key].css || [])]);
const entrySizes = await Promise.all([...new Set(entryFiles)].map(async file => ({ file, bytes: (await stat(path.join(dist, file))).size })));
const report = { label, timestamp: new Date().toISOString(), browser: browser.version(), runs, stateDelayMs: delay, fixtureName, countFormatters, profiled: profileCpu, recordCounts: fixture.counts, fixtureBytes: Buffer.byteLength(JSON.stringify(fixture.state)), fixture: `Fictional ${fixtureName} owner, optional services unavailable, production Express static handler with negotiated build-time compression, fresh context per sample, service worker blocked, no external requests${profileCpu ? ', CPU profiling enabled (diagnostic timings)' : ''}`, entrySizes, pages: results };
await mkdir(output, { recursive: true });
await writeFile(path.join(output, `${label}.json`), JSON.stringify(report, null, 2));
if (label === 'baseline') await writeFile(path.join(output, `${report.timestamp.replaceAll(/[:.]/g, '-')}-baseline.json`), JSON.stringify(report, null, 2), { flag: 'wx' });
const rows = results.map(page => `| ${page.path} | ${page.metrics.ready == null ? 'N/A' : Math.round(page.metrics.ready)} | ${page.metrics.fcp == null ? 'N/A' : Math.round(page.metrics.fcp)} | ${page.metrics.lcp == null ? 'N/A' : Math.round(page.metrics.lcp)} | ${(page.metrics.jsBytes / 1000).toFixed(1)} | ${(page.metrics.cssBytes / 1000).toFixed(1)} | ${page.metrics.requests} | ${page.failures.length ? page.failures.join('; ') : 'Rendered'} |`);
await writeFile(path.join(output, `${label}.md`), `# Production page performance: ${label}\n\n${report.fixture}. ${runs} run(s) per page; medians. Timings in ms, decoded sizes in decimal KB. First heading measures the initial heading, not completion of nested tabs or requests. Collection waits for the page loading skeleton to disappear, then observes 350ms of post-render work. This is a local synthetic browser benchmark, not real-user or backend performance.\n\n| Route | First heading | FCP | LCP | JS KB | CSS KB | Requests | Result |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |\n${rows.join('\n')}\n`);
console.log(`Saved ${results.length} pages to .gstack/benchmark-reports/${label}.{json,md}`);
if (results.some(page => page.failures.length)) process.exitCode = 1;
