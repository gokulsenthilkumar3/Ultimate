// Real Lighthouse lab audits of the production build with synthetic API data.
// No owner backend/session, external requests, paid services or public tunnel.
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import express from 'express';
import { registerFrontend } from '../server/frontend.js';
import { loadServerConfig } from '../server/config.js';
import { performanceFixture } from './performance-fixture.mjs';
import { OWNER } from '../tests/e2e/foundation-fixture.ts';
import { FEATURES } from '../src/config/featureRegistry.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const option = (name, fallback) => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const tools = path.resolve(root, option('tools', '../.code-index/performance-tools'));
const require = createRequire(path.join(tools, 'package.json'));
const { default: lighthouse } = await import(pathToFileURL(require.resolve('lighthouse')).href);
const { default: desktopConfig } = await import(pathToFileURL(require.resolve('lighthouse/core/config/desktop-config.js')).href);
const { launch } = await import(pathToFileURL(require.resolve('chrome-launcher')).href);
const output = path.resolve(root, option('output', '../.code-index/performance/lighthouse'));
const requested = option('pages', 'welcome,login,overview,tasks,help,finsync').split(',');
const profiles = option('profiles', 'desktop,mobile').split(',');
if (profiles.some(profile => !['desktop', 'mobile'].includes(profile))) throw new Error('Use desktop and/or mobile profiles.');
const routes = [...FEATURES.map(feature => ({ id: feature.id, path: feature.canonicalPath })),
  ...['welcome', 'login', 'privacy', 'terms'].map(id => ({ id, path: `/${id}`, public: true }))];
const pages = requested.map(id => routes.find(page => page.id === id));
if (pages.some(page => !page)) throw new Error('Unknown audit page.');
await mkdir(output, { recursive: true });
const fixture = performanceFixture('populated');
const app = express();
app.use('/api', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const url = req.path;
  if (url === '/auth/me') return req.get('x-performance-anonymous') === '1'
    ? res.status(401).json({ error: 'Synthetic signed-out context' }) : res.json({ user: OWNER, expiresAt: '2099-01-01T00:00:00Z' });
  if (url.includes('csrf')) return res.json({ csrfToken: 'synthetic-audit-csrf' });
  if (url === '/state') return res.json(fixture.state);
  if (url === '/health') return res.json({ status: 'online', database: { status: 'CONNECTED' } });
  if (url === '/capabilities') return res.json({ version: 'synthetic-audit', billing: { checkoutAvailable: false, tier: null }, connections: [] });
  if (url === '/agents/readiness') return res.json({ ready: false, code: 'setup_required', models: [] });
  if (url.startsWith('/habit_logs/')) return res.json(fixture.habitLogs[url.split('/').at(-1)] || []);
  if (url === '/portfolio') return res.json(fixture.state.user.portfolio);
  if (['/notes', '/goals', '/tasks', '/documents', '/subscriptions', '/finance', '/timesheet'].includes(url)) return res.json(fixture.state[url.slice(1)] || []);
  if (['/notifications', '/locations', '/budgets', '/integrations/providers', '/custom-tables', '/database/tables'].includes(url)) return res.json([]);
  if (url === '/logs' && req.method === 'POST') return res.json({ success: true });
  return res.status(503).json({ code: url.startsWith('/admin/products/') ? 'ADMIN_ADAPTER_NOT_CONFIGURED' : 'SYNTHETIC_SERVICE_UNAVAILABLE' });
});
registerFrontend(app, { distDirectory: path.resolve(root, option('dist', 'dist')), frontendBasePath: '/Ultimate/', securityConfig: loadServerConfig({}) });
const server = createServer(app);
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const chromePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
let chrome;
const results = [];
try {
  chrome = await launch({ chromePath, chromeFlags: ['--headless=new', '--disable-gpu', '--no-first-run',
    '--proxy-server=http://127.0.0.1:9', '--proxy-bypass-list=127.0.0.1;localhost'] });
  for (const profile of profiles) for (const page of pages) {
    const url = `${origin}/Ultimate${page.path}`;
    const result = await lighthouse(url, { port: chrome.port, logLevel: 'error', output: ['json', 'html'],
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      extraHeaders: page.public ? { 'x-performance-anonymous': '1' } : {},
    }, profile === 'desktop' ? desktopConfig : undefined);
    if (!result?.lhr || result.lhr.runtimeError) throw new Error(`Lighthouse failed for ${page.id}: ${result?.lhr.runtimeError?.code || 'no report'}`);
    const { lhr } = result;
    await writeFile(path.join(output, `${page.id}-${profile}.json`), result.report[0]);
    await writeFile(path.join(output, `${page.id}-${profile}.html`), result.report[1]);
    const metrics = Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'speed-index', 'total-blocking-time', 'cumulative-layout-shift', 'server-response-time', 'total-byte-weight'].map(id => [id, lhr.audits[id]?.numericValue ?? null]));
    const scores = Object.fromEntries(Object.entries(lhr.categories).map(([id, category]) => [id, category.score == null ? null : Math.round(category.score * 100)]));
    const findings = Object.values(lhr.audits).filter(audit => audit.score != null && audit.score < 1 && ['binary', 'numeric', 'metricSavings'].includes(audit.scoreDisplayMode))
      .map(({ id, title, score, displayValue }) => ({ id, title, score, displayValue }));
    results.push({ id: page.id, path: page.path, profile, lighthouseVersion: lhr.lighthouseVersion, scores, metrics, findings, warnings: lhr.runWarnings });
    console.log(`${page.id} ${profile}: ${JSON.stringify(scores)} LCP=${Math.round(metrics['largest-contentful-paint'])}ms TBT=${Math.round(metrics['total-blocking-time'])}ms CLS=${metrics['cumulative-layout-shift']}`);
    // Preserve completed reports if a later audit is interrupted.
    await writeFile(path.join(output, 'summary.json'), JSON.stringify({ timestamp: new Date().toISOString(), fixture: 'Synthetic populated owner; optional services unavailable; production build on loopback; external traffic blocked by proxy. Lighthouse simulated lab throttling, not CrUX field data.', results }, null, 2));
  }
} finally {
  await chrome?.kill();
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
