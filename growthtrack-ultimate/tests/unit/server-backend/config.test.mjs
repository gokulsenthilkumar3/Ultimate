import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, loadServerConfig } from '../../../server/config.js';
import { createConnectors } from '../../../server/domains/sync/connectors.js';
import { createSecurity } from '../../../server/security.js';
import { createJsonErrorHandler } from '../../../server/domains/errors.js';
import { renderServerHealthHtml } from '../../../server/serverHealthHtml.js';

const KEY = 'b'.repeat(64);
test('log cleanup can be disabled explicitly for a data-preserving local startup', () => {
  assert.equal(loadServerConfig({}).logs.cleanupEnabled, true);
  assert.equal(loadServerConfig({ LOG_CLEANUP_ENABLED: 'off' }).logs.cleanupEnabled, false);
});

test('unified workspace handoffs stay on the public Ultimate UI and health uses the API gateway', () => {
  const config = loadServerConfig({ GROWTHTRACK_WORKSPACE: '1', APP_URL: 'http://localhost:5000/Ultimate/', GATEWAY_URL: 'http://localhost:3000' });
  for (const product of config.gateway.companions) {
    assert.equal(new URL(product.callbackUrl).origin, 'http://localhost:5000');
    assert.match(product.callbackUrl, new RegExp(`/Ultimate/products/${product.id}/`));
    assert.equal(product.healthUrl, `http://localhost:3000/api/${product.id}/health`);
  }
});

test('defaults are complete, frozen and derive companion URLs from one base each', () => {
  assert.equal(DEFAULT_CONFIG.server.port, 3001);
  assert.equal(DEFAULT_CONFIG.server.jsonBodyLimit, '8mb');
  assert.ok(Object.isFrozen(DEFAULT_CONFIG.gateway.companions[0]));
  assert.throws(() => { DEFAULT_CONFIG.server.port = 1; }, TypeError);
  const finsync = DEFAULT_CONFIG.gateway.companions.find(item => item.id === 'finsync');
  assert.deepEqual([finsync.healthUrl, finsync.callbackUrl], ['http://localhost:5101/api/health', 'http://localhost:5101/auth/ultimate/callback']);
  assert.equal(DEFAULT_CONFIG.gateway.companions.find(item => item.id === 'forex').callbackUrl, 'http://localhost:8501');
  assert.equal(DEFAULT_CONFIG.security.origins.length, 8, 'development allows the local dev ports');
});

test('environment overrides are applied, trimmed and blank values count as unset', () => {
  const config = loadServerConfig({ PORT: '4000', COMPANION_FINSYNC_URL: 'https://finsync.example.com/', APP_ORIGINS: ' https://app.example.com , ',
    SYNC_INTERVAL_ICS_MINUTES: '15', GROWTHTRACK_SYNC_SCHEDULER: 'off', GROWTHTRACK_RECORD_ROWS: '1', APP_ENCRYPTION_KEY: '', APP_URL: 'https://app.example.com/Ultimate/' });
  assert.equal(config.server.port, 4000);
  assert.equal(config.server.appUrl, 'https://app.example.com/Ultimate/', 'APP_URL keeps its trailing slash');
  assert.equal(config.gateway.companions[0].healthUrl, 'https://finsync.example.com/api/health');
  assert.deepEqual(config.security.origins, ['https://app.example.com']);
  assert.match(config.security.frameAncestors, /https:\/\/app\.example\.com/);
  assert.equal(config.sync.intervals.ics, 15);
  assert.equal(config.sync.scheduler.enabled, false);
  assert.equal(config.features.recordRows, true);
  assert.equal(config.security.encryptionKey, null);
});

test('invalid settings stop startup with every problem listed', () => {
  assert.throws(() => loadServerConfig({ PORT: 'eighty', SESSION_HOURS: '0', SYNC_MFAPI_BASE_URL: 'http://api.mfapi.in', COMPANION_OXFIN_URL: 'ftp://x', APP_ENCRYPTION_KEY: 'short', GROWTHTRACK_RECORD_ROWS: 'maybe' }), error => {
    for (const name of ['PORT', 'SESSION_HOURS', 'SYNC_MFAPI_BASE_URL', 'COMPANION_OXFIN_URL', 'APP_ENCRYPTION_KEY', 'GROWTHTRACK_RECORD_ROWS']) assert.match(error.message, new RegExp(name));
    return true;
  });
  assert.throws(() => loadServerConfig({ COMPANION_FAMILY_URL: 'https://user:pass@family.example.com' }), /COMPANION_FAMILY_URL/);
});

test('production refuses an ephemeral handoff secret and drops local origins', () => {
  assert.throws(() => loadServerConfig({ NODE_ENV: 'production' }), /HANDOFF_SECRET/);
  const config = loadServerConfig({ NODE_ENV: 'production', HANDOFF_SECRET: KEY });
  assert.deepEqual(config.security.origins, []);
  assert.equal(config.security.frameAncestors, "'self'");
  assert.equal(config.server.serveFrontend, true);
});

test('connectors use configured provider hosts, intervals and per-run limits', async () => {
  const config = loadServerConfig({ SYNC_MFAPI_BASE_URL: 'https://nav-proxy.example.com/v2', SYNC_INTERVAL_MFAPI_MINUTES: '30', SYNC_MFAPI_PER_RUN: '1', SYNC_ALPHAVANTAGE_PER_RUN: '2' });
  const connectors = createConnectors(config.sync);
  const mfapi = connectors.find(item => item.key === 'mfapi');
  assert.equal(mfapi.autoSyncMinutes, 30);
  assert.match(connectors.find(item => item.key === 'alphavantage').fields[0].help, /2 holdings are refreshed per run/);
  const calls = [];
  const holdings = ['100001', '100002'].map((code, index) => ({ id: `mf-${index}`, name: code, type: 'Mutual Fund', symbol: code }));
  const result = await mfapi.quotes({ holdings, fetchJson: async (url, options) => { calls.push([url, options.allowHosts]); return { data: [{ date: '16-10-2026', nav: '10.5' }] }; } });
  assert.deepEqual(calls, [['https://nav-proxy.example.com/v2/mf/100001/latest', ['nav-proxy.example.com']]]);
  assert.equal(result.quotes.size, 1);
  assert.match(result.unmatched[0].reason, /Run limit/);
});

test('security throttle, origins and CSP follow configuration', () => {
  const config = loadServerConfig({ API_RATE_LIMIT_PER_MINUTE: '2', APP_ORIGINS: 'https://app.example.com' });
  const security = createSecurity({ prisma: {}, logToFile: () => {}, config });
  const res = () => ({ statusCode: 200, headers: {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; }, setHeader(key, value) { this.headers[key] = value; } });
  const statuses = [];
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = res(); let passed = false;
    security.apiRateLimit({ method: 'POST', ip: '1.2.3.4', path: '/api/x' }, response, () => { passed = true; });
    statuses.push(passed ? 200 : response.statusCode);
  }
  assert.deepEqual(statuses, [200, 200, 429]);
  const headers = res(); security.headers({ path: '/api/x' }, headers, () => {});
  assert.match(headers.headers['Content-Security-Policy'], /frame-ancestors 'self' https:\/\/app\.example\.com http:\/\/localhost:\*/);
  const allowed = []; security.corsOptions.origin('https://app.example.com', (error, value) => allowed.push(error ? 'denied' : value));
  security.corsOptions.origin('http://localhost:5173', error => allowed.push(error ? 'denied' : 'allowed'));
  assert.deepEqual(allowed, ['https://app.example.com', 'denied'], 'configured origins replace the local defaults');
});

test('the final error handler always answers JSON without internals', () => {
  const logged = [];
  const handler = createJsonErrorHandler({ logToFile: (...args) => logged.push(args) });
  const run = error => { const res = { headersSent: false, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; handler(error, { requestId: 'r1', path: '/api/x' }, res, () => {}); return res; };
  assert.deepEqual(run(Object.assign(new Error('Unexpected token'), { status: 400, type: 'entity.parse.failed' })).body, { code: 'INVALID_JSON', error: 'The request body is not valid JSON.', requestId: 'r1' });
  assert.equal(run(Object.assign(new Error('too big'), { status: 413, type: 'entity.too.large' })).body.code, 'PAYLOAD_TOO_LARGE');
  const crash = run(new Error('SELECT * FROM secret_table failed at /srv/app/server.js:12'));
  assert.deepEqual([crash.statusCode, crash.body.code, crash.body.error], [500, 'INTERNAL_ERROR', 'Unable to complete this request.']);
  assert.doesNotMatch(JSON.stringify(crash.body), /secret_table|server\.js/);
  assert.equal(logged.length, 1, 'only server errors are logged');
});

test('the health page links come from configuration and are escaped', () => {
  const html = renderServerHealthHtml({ status: 'online', version: '2.0.1', port: 3001, nodeVersion: 'v24', platform: 'win32-x64', uptimeSeconds: 5, uptimeFormatted: '5s',
    memory: { heapUsedMB: 1, heapTotalMB: 2, heapPercent: 50 }, database: { file: 'ultimate.db', status: 'CONNECTED', latencyMs: 1 }, subsystems: {} }, { app: 'https://app.example.com/"x', dbStudio: 'https://db.example.com', gateway: 'https://gw.example.com/health' });
  assert.match(html, /href="https:\/\/app\.example\.com\/&quot;x"/);
  assert.match(html, /href="https:\/\/gw\.example\.com\/health"/);
  assert.doesNotMatch(html, /localhost:5556|localhost:3000/);
});
