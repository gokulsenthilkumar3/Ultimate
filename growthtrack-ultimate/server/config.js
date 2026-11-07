import { z } from 'zod';
import { PRODUCTS } from '../src/config/products.js';
import { rejectExposedDeploymentSecrets } from './exposedSecrets.js';

// One validated source for every backend setting. Each value can be set from
// the environment; the defaults below are the only place they are written
// down. An invalid value stops startup with a list of every problem instead
// of silently becoming NaN or an unexpected fallback.

const MINUTE = 60_000;
const int = (fallback, min, max) => z.coerce.number().int().min(min).max(max).default(fallback);
const flag = fallback => z.enum(['1', '0', 'true', 'false', 'on', 'off', 'yes', 'no']).default(fallback)
  .transform(value => ['1', 'true', 'on', 'yes'].includes(value));
const list = fallback => z.string().default(fallback)
  .transform(value => value.split(',').map(item => item.trim()).filter(Boolean));
const originList = list('').pipe(z.array(z.string().refine(value => {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && url.origin === value; }
  catch { return false; }
}, 'must be an exact http(s) origin without a path, credentials or wildcard')));
// Base URLs drop a trailing slash so paths can be appended; APP_URL is kept as
// written because the frontend base path is significant.
const httpUrl = (fallback, { trimSlash = true } = {}) => z.string().default(fallback).transform((value, context) => {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('protocol');
    return trimSlash ? value.trim().replace(/\/+$/, '') : value.trim();
  } catch {
    context.addIssue({ code: 'custom', message: 'must be an http(s) URL' });
    return z.NEVER;
  }
});
const httpsUrl = fallback => httpUrl(fallback).refine(value => value.startsWith('https://'), 'must use https');

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  // HTTP server
  PORT: int(3001, 1, 65535),
  LISTEN_HOST: z.string().min(1).default('127.0.0.1'),
  APP_URL: httpUrl('http://localhost:5000/Ultimate', { trimSlash: false }),
  APP_ORIGINS: originList,
  CSP_CONNECT_ORIGINS: originList,
  DEV_ORIGIN_PORTS: list('3001,5000,5001,5173'),
  TRUST_PROXY: flag('false'),
  SERVE_FRONTEND: flag('false'),
  FRONTEND_BASE_PATH: z.string().optional(),
  JSON_BODY_LIMIT_MB: int(8, 1, 64),
  // Sessions and abuse limits
  SESSION_HOURS: int(12, 1, 24 * 30),
  SESSION_TOUCH_MS: int(5 * MINUTE, 1000, 24 * 60 * MINUTE),
  LOGIN_WINDOW_MS: int(15 * MINUTE, 1000, 24 * 60 * MINUTE),
  LOGIN_MAX_ATTEMPTS: int(5, 1, 100),
  API_RATE_LIMIT_PER_MINUTE: int(120, 1, 100_000),
  HANDOFF_SECRET: z.string().regex(/^[a-f0-9]{64}$/i, 'must be 64 hexadecimal characters').optional(),
  APP_ENCRYPTION_KEY: z.string().regex(/^[a-f0-9]{64}$/i, 'must be 64 hexadecimal characters').optional(),
  OWNER_MFA_SECRET: z.string().regex(/^[A-Z2-7]{32,128}$/, 'must be an unpadded uppercase Base32 secret of at least 160 bits').optional(),
  BACKUP_ENABLED: flag('off'),
  BACKUP_DIR: z.string().min(1).default('backups'),
  BACKUP_INTERVAL_HOURS: int(24, 1, 168),
  BACKUP_FIRST_RUN_SECONDS: int(60, 0, 3600),
  // Logs and gateway
  LOG_RETENTION_DAYS: int(90, 1, 3650),
  LOG_CLEANUP_HOURS: int(6, 1, 168),
  LOG_CLEANUP_ENABLED: flag('on'),
  GATEWAY_PROBE_TIMEOUT_MS: int(1800, 100, 30_000),
  COMPANION_FINSYNC_URL: httpUrl('http://localhost:5101'),
  COMPANION_OXFIN_URL: httpUrl('http://localhost:5102'),
  COMPANION_FOREX_URL: httpUrl('http://localhost:8501'),
  COMPANION_FAMILY_URL: httpUrl('http://localhost:5104'),
  FAMILY_API_URL: httpUrl('http://127.0.0.1:3104').refine(value => { const url = new URL(value); return url.pathname === '/' && !url.search && !url.hash && (url.protocol === 'https:' || ['127.0.0.1', 'localhost', '[::1]', 'family-api'].includes(url.hostname)); }, 'must be an HTTPS origin or trusted local Family service origin'),
  FAMILY_ULTIMATE_SECRET: z.string().regex(/^[a-f0-9]{64}$/i, 'must be 64 hexadecimal characters').optional(),
  COMPANION_EQUITY_URL: httpUrl('http://localhost:5105'),
  FOREX_API_URL: httpUrl('http://127.0.0.1:8000'),
  DB_STUDIO_URL: httpUrl('http://localhost:5556'),
  GATEWAY_URL: httpUrl('http://127.0.0.1:5300'),
  GROWTHTRACK_WORKSPACE: flag('0'),
  // Feature gates
  GROWTHTRACK_NOTES_V1: flag('0'),
  GROWTHTRACK_RECORD_ROWS: flag('0'),
  // Record rows
  RECORD_CALENDAR_LIMIT: int(5000, 1, 100_000),
  RECORD_HOLDINGS_LIMIT: int(200, 1, 10_000),
  RECORD_MAX_KB: int(64, 1, 1024),
  // Sync engine
  GROWTHTRACK_SYNC_SCHEDULER: flag('on'),
  SYNC_SCHEDULER_INTERVAL_MINUTES: int(5, 1, 24 * 60),
  SYNC_FIRST_RUN_SECONDS: int(30, 0, 3600),
  SYNC_FETCH_TIMEOUT_MS: int(10_000, 1000, 120_000),
  SYNC_FEED_TIMEOUT_MS: int(15_000, 1000, 120_000),
  SYNC_FEED_MAX_MB: int(5, 1, 50),
  SYNC_CALENDAR_PAST_DAYS: int(30, 0, 3650),
  SYNC_CALENDAR_FUTURE_DAYS: int(400, 1, 3650),
  SYNC_INTERVAL_MFAPI_MINUTES: int(360, 5, 7 * 24 * 60),
  SYNC_INTERVAL_COINGECKO_MINUTES: int(60, 5, 7 * 24 * 60),
  SYNC_INTERVAL_ALPHAVANTAGE_MINUTES: int(720, 5, 7 * 24 * 60),
  SYNC_INTERVAL_ICS_MINUTES: int(60, 5, 7 * 24 * 60),
  SYNC_MFAPI_PER_RUN: int(60, 1, 1000),
  SYNC_ALPHAVANTAGE_PER_RUN: int(5, 1, 500),
  SYNC_MFAPI_BASE_URL: httpsUrl('https://api.mfapi.in'),
  SYNC_COINGECKO_BASE_URL: httpsUrl('https://api.coingecko.com'),
  SYNC_ALPHAVANTAGE_BASE_URL: httpsUrl('https://www.alphavantage.co'),
});

const companion = (id, name, base, callbackPath = '/auth/ultimate/callback') => Object.freeze({
  id, name, baseUrl: base, healthUrl: `${base}/api/health`, callbackUrl: callbackPath ? `${base}${callbackPath}` : base,
});

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

/** Parse and validate settings. Empty strings count as unset, matching the
    blank entries in .env.example. */
export function loadServerConfig(env = process.env) {
  const input = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== undefined && value !== ''));
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid server configuration:\n- ${problems.join('\n- ')}`);
  }
  const e = parsed.data;
  rejectExposedDeploymentSecrets(e);
  const production = e.NODE_ENV === 'production';
  if (production && !e.HANDOFF_SECRET) throw new Error('Invalid server configuration:\n- HANDOFF_SECRET: required in production for a stable signing identity; outstanding handoffs remain process-local');
  if (e.BACKUP_ENABLED && !e.APP_ENCRYPTION_KEY) throw new Error('Invalid server configuration:\n- APP_ENCRYPTION_KEY: required for encrypted scheduled backups');
  const devOrigins = e.DEV_ORIGIN_PORTS.flatMap(port => [`http://localhost:${port}`, `http://127.0.0.1:${port}`]);
  const origins = e.APP_ORIGINS.length ? e.APP_ORIGINS : production ? [] : devOrigins;
  const frameAncestors = ["'self'", ...e.APP_ORIGINS, ...(production ? [] : ['http://localhost:*', 'http://127.0.0.1:*'])].join(' ');
  const workspaceCompanion = (id, name, base, callbackPath) => {
    if (!e.GROWTHTRACK_WORKSPACE) return companion(id, name, base, callbackPath);
    const product = PRODUCTS.find(item => item.id === id);
    return Object.freeze({ id, name, baseUrl: base, healthUrl: `${e.GATEWAY_URL}${product.healthUrl}`, callbackUrl: new URL(product.callbackUrl, e.APP_URL).href });
  };
  return deepFreeze({
    env: e.NODE_ENV, production,
    server: { port: e.PORT, listenHost: e.LISTEN_HOST, appUrl: e.APP_URL, trustProxy: e.TRUST_PROXY,
      serveFrontend: e.SERVE_FRONTEND || production, frontendBasePath: e.FRONTEND_BASE_PATH, jsonBodyLimit: `${e.JSON_BODY_LIMIT_MB}mb` },
    security: { origins, frameAncestors, connectOrigins: [...new Set(['https://api.open-meteo.com', 'https://api.stripe.com', 'https://api-js.mixpanel.com', ...e.CSP_CONNECT_ORIGINS])], mfaSecret: e.OWNER_MFA_SECRET || null, sessionHours: e.SESSION_HOURS, sessionTouchMs: e.SESSION_TOUCH_MS,
      loginWindowMs: e.LOGIN_WINDOW_MS, loginMaxAttempts: e.LOGIN_MAX_ATTEMPTS, apiRateLimitPerMinute: e.API_RATE_LIMIT_PER_MINUTE,
      handoffSecret: e.HANDOFF_SECRET || null, encryptionKey: e.APP_ENCRYPTION_KEY || null },
    logs: { retentionDays: e.LOG_RETENTION_DAYS, cleanupIntervalMs: e.LOG_CLEANUP_HOURS * 60 * MINUTE, cleanupEnabled: e.LOG_CLEANUP_ENABLED },
    backup: { enabled: e.BACKUP_ENABLED, directory: e.BACKUP_DIR, intervalMs: e.BACKUP_INTERVAL_HOURS * 60 * MINUTE, firstRunMs: e.BACKUP_FIRST_RUN_SECONDS * 1000 },
    gateway: { probeTimeoutMs: e.GATEWAY_PROBE_TIMEOUT_MS, url: e.GATEWAY_URL, dbStudioUrl: e.DB_STUDIO_URL,
      companions: [
        workspaceCompanion('finsync', 'FinSync', e.COMPANION_FINSYNC_URL),
        workspaceCompanion('oxfin', 'OxFin', e.COMPANION_OXFIN_URL),
        workspaceCompanion('forex', 'Forex', e.COMPANION_FOREX_URL, null),
        workspaceCompanion('family', 'Family Connect', e.COMPANION_FAMILY_URL),
        workspaceCompanion('equity', 'Equity/NiftyLens', e.COMPANION_EQUITY_URL),
      ] },
    nativeModules: { forexUrl: e.FOREX_API_URL },
    features: { notesV1: e.GROWTHTRACK_NOTES_V1, recordRows: e.GROWTHTRACK_RECORD_ROWS },
    family: { baseUrl: e.FAMILY_API_URL, secret: e.FAMILY_ULTIMATE_SECRET || null },
    records: { limits: { calendar: e.RECORD_CALENDAR_LIMIT, holdings: e.RECORD_HOLDINGS_LIMIT }, maxRecordBytes: e.RECORD_MAX_KB * 1024 },
    sync: {
      scheduler: { enabled: e.GROWTHTRACK_SYNC_SCHEDULER, intervalMs: e.SYNC_SCHEDULER_INTERVAL_MINUTES * MINUTE, firstRunMs: e.SYNC_FIRST_RUN_SECONDS * 1000 },
      fetch: { timeoutMs: e.SYNC_FETCH_TIMEOUT_MS, feedTimeoutMs: e.SYNC_FEED_TIMEOUT_MS, feedMaxBytes: e.SYNC_FEED_MAX_MB * 1024 * 1024 },
      calendarWindow: { pastDays: e.SYNC_CALENDAR_PAST_DAYS, futureDays: e.SYNC_CALENDAR_FUTURE_DAYS },
      intervals: { mfapi: e.SYNC_INTERVAL_MFAPI_MINUTES, coingecko: e.SYNC_INTERVAL_COINGECKO_MINUTES, alphavantage: e.SYNC_INTERVAL_ALPHAVANTAGE_MINUTES, ics: e.SYNC_INTERVAL_ICS_MINUTES },
      perRun: { mfapi: e.SYNC_MFAPI_PER_RUN, alphavantage: e.SYNC_ALPHAVANTAGE_PER_RUN },
      providers: { mfapi: e.SYNC_MFAPI_BASE_URL, coingecko: e.SYNC_COINGECKO_BASE_URL, alphavantage: e.SYNC_ALPHAVANTAGE_BASE_URL },
    },
  });
}

/** Defaults with no environment, for tests and library callers. */
export const DEFAULT_CONFIG = loadServerConfig({});
