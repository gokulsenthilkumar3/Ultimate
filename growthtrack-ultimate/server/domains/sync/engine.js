import crypto from 'node:crypto';
import { domainError, sendDomainError, transactionWithRetry } from '../errors.js';
import { normalizePortfolioPayload, PORTFOLIO_MAX_BYTES } from '../portfolio.js';
import { CONNECTORS } from './connectors.js';
import { safeFetchJson, safeFetchText } from './safeFetch.js';
import { DEFAULT_CONFIG } from '../../config.js';

const PORTFOLIO_LIMIT = PORTFOLIO_MAX_BYTES;
const HISTORY_CAPS = [120, 60, 30, 10, 0];

const parseArray = value => {
  try { const parsed = JSON.parse(value || '[]'); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
};
const validTimeZone = value => {
  // Keep the owner's spelling (ICU may canonicalize Asia/Kolkata to Asia/Calcutta).
  try { return typeof value === 'string' && value.length <= 64 && Intl.DateTimeFormat('en', { timeZone: value }) ? value : null; } catch { return null; }
};

/** Apply dated quotes to the stored holdings. Observations are appended to a
    bounded priceHistory; older entries are trimmed only to respect the
    portfolio size limit, never to drop the latest quote. */
export function applyQuotes(holdings, quotes, fetchedAt) {
  const changed = []; const conflicts = []; const accepted = new Map();
  for (const holding of holdings) {
    const quote = quotes.get(holding.id);
    if (!quote) continue;
    if (quote.currency && holding.currency && String(holding.currency).toUpperCase() !== quote.currency) {
      conflicts.push({ id: holding.id, name: holding.name, reason: `Quote is in ${quote.currency}; the holding is recorded in ${holding.currency}.` });
      continue;
    }
    accepted.set(holding.id, quote);
    if (holding.currentPrice !== quote.price || holding.priceDate !== quote.date) changed.push(holding.id);
  }
  const withQuotes = cap => holdings.map(holding => {
    const quote = accepted.get(holding.id);
    if (!quote) return holding;
    const entry = { date: quote.date, price: quote.price, ...(quote.currency ? { currency: quote.currency } : {}), provenance: quote.source };
    const history = Array.isArray(holding.priceHistory) ? holding.priceHistory.filter(item => !(item?.date === quote.date && item?.provenance === quote.source)) : [];
    return { ...holding, currentPrice: quote.price, priceDate: quote.date,
      quote: { price: quote.price, date: quote.date, currency: quote.currency || null, source: quote.source, reference: quote.reference || null, fetchedAt },
      priceHistory: cap ? [...history, entry].slice(-cap) : [entry] };
  });
  for (const cap of HISTORY_CAPS) {
    const normalized = normalizePortfolioPayload(withQuotes(cap));
    if (Buffer.byteLength(JSON.stringify(normalized), 'utf8') <= PORTFOLIO_LIMIT) return { holdings: normalized, changed, conflicts };
  }
  throw domainError(413, 'PORTFOLIO_LIMIT', 'The portfolio is too large to store new prices.');
}

export function createSyncEngine({ prisma, sealer, fetchText = safeFetchText, fetchJson = safeFetchJson, logEvent = async () => {}, now = () => new Date(), connectors = CONNECTORS, records = null, fetchDefaults = DEFAULT_CONFIG.sync.fetch }) {
  const inflight = new Set();
  // Provider requests use the configured timeout unless a connector sets its own.
  const getJson = (url, options = {}) => fetchJson(url, { timeoutMs: fetchDefaults.timeoutMs, ...options });
  const getText = (url, options = {}) => fetchText(url, { timeoutMs: fetchDefaults.timeoutMs, ...options });
  const byKey = key => {
    const connector = connectors.find(item => item.key === key);
    if (!connector) throw domainError(404, 'CONNECTOR_NOT_FOUND', 'This connector does not exist.');
    return connector;
  };
  const context = (userId, key) => `${userId}:${key}`;
  const findRow = (userId, key) => prisma.integrationCredential.findUnique({ where: { userId_provider: { userId, provider: key } } });
  const readState = (row, key) => sealer.open(row.clientIdCiphertext, `${context(row.userId, key)}:state`) || {};
  const readSecret = (row, key) => sealer.open(row.accessTokenCiphertext, `${context(row.userId, key)}:secret`);

  function describe(connector, row) {
    const base = { key: connector.key, label: connector.label, description: connector.description, provider: connector.provider,
      docsUrl: connector.docsUrl, domain: connector.domain, target: connector.target, autoSyncMinutes: connector.autoSyncMinutes,
      fields: connector.fields.map(({ name, label, type, required = false, placeholder = '', help = '' }) => ({ name, label, type, required, placeholder, help })),
      requiresEncryptionKey: Boolean(connector.requiresSecret && !sealer.canSeal) };
    if (!row) return { ...base, status: base.requiresEncryptionKey ? 'needs-key' : 'available', connection: null };
    try {
      const state = readState(row, connector.key);
      return { ...base, status: row.enabled ? 'connected' : 'paused', connection: {
        accountName: row.accountName, autoSync: state.autoSync !== false, config: state.config || {},
        hasSecret: Boolean(row.accessTokenCiphertext), lastSyncAt: row.lastSyncAt, lastRun: state.lastRun || null } };
    } catch (error) {
      return { ...base, status: 'error', connection: { accountName: row.accountName, lastSyncAt: row.lastSyncAt, error: error.message } };
    }
  }

  async function list(userId) {
    const rows = await prisma.integrationCredential.findMany({ where: { userId, provider: { in: connectors.map(item => item.key) } } });
    return connectors.map(connector => describe(connector, rows.find(row => row.provider === connector.key)));
  }

  async function connect(userId, key, body = {}) {
    const connector = byKey(key);
    const existing = await findRow(userId, key);
    let previousSecret = null;
    if (existing?.accessTokenCiphertext) { try { previousSecret = readSecret(existing, key); } catch { previousSecret = null; } }
    const { config, secret } = connector.normalize(body.config || {}, previousSecret);
    if (connector.target === 'calendar') config.timeZone = validTimeZone(body.timeZone) || validTimeZone(config.timeZone) || 'UTC';
    let previousState = {};
    if (existing) { try { previousState = readState(existing, key); } catch { previousState = {}; } }
    const state = { config, autoSync: body.autoSync !== false, lastRun: previousState.lastRun || null };
    const data = {
      accountName: config.label || connector.label, enabled: true, updatedBy: userId,
      clientIdCiphertext: sealer.seal(state, `${context(userId, key)}:state`),
      accessTokenCiphertext: secret ? sealer.seal(secret, `${context(userId, key)}:secret`, { requireEncryption: true }) : null,
    };
    await prisma.integrationCredential.upsert({
      where: { userId_provider: { userId, provider: key } },
      create: { ...data, userId, provider: key, createdBy: userId },
      update: data,
    });
    await logEvent({ category: 'sync', action: existing ? 'sync.reconfigure' : 'sync.connect', table_name: 'sync', item_id: key, user_id: userId, details: { connector: key } });
    return describe(connector, await findRow(userId, key));
  }

  async function disconnect(userId, key, { removeData = false } = {}) {
    const connector = byKey(key);
    const row = await findRow(userId, key);
    if (!row) throw domainError(404, 'CONNECTION_NOT_FOUND', 'This connector is not connected.');
    let removed = 0; let data;
    await transactionWithRetry(prisma, async tx => {
      if (removeData && connector.target === 'calendar' && records) {
        for (const id of await records.calendar.syncedIds(tx, userId, key)) if (await records.calendar.systemRemove(tx, userId, id)) removed += 1;
      } else if (removeData && connector.target === 'calendar') {
        const user = await tx.user.findUnique({ where: { id: userId }, select: { calendarEvents: true } });
        const events = parseArray(user?.calendarEvents);
        const kept = events.filter(event => event?.syncProvider !== key);
        removed = events.length - kept.length;
        await tx.user.update({ where: { id: userId }, data: { calendarEvents: JSON.stringify(kept) } });
        data = { calendar_events: kept };
      }
      await tx.integrationCredential.delete({ where: { userId_provider: { userId, provider: key } } });
    });
    if (removed && records) data = { calendar_events: await records.calendar.listAll(userId) };
    await logEvent({ category: 'sync', action: 'sync.disconnect', table_name: 'sync', item_id: key, user_id: userId, details: { removedEvents: removed } });
    return { disconnected: true, removed, ...(data ? { data } : {}) };
  }

  // Row storage: quotes are merged onto the latest row and bump its revision,
  // so a client still holding the older revision gets a conflict, not a clobber.
  async function syncPortfolioRows(userId, connector, config, secret, fetchedAt) {
    const holdings = await records.holdings.listAll(userId);
    const { quotes, unmatched } = await connector.quotes({ holdings, config, secret, fetchJson: getJson, now: now() });
    if (!quotes.size) return { summary: { matched: 0, updated: 0, unmatched: unmatched.length }, issues: unmatched, data: null };
    let applied;
    await transactionWithRetry(prisma, async tx => {
      applied = applyQuotes(await records.holdings.listAll(userId, tx), quotes, fetchedAt);
      for (const id of applied.changed) await records.holdings.systemPut(tx, userId, applied.holdings.find(holding => holding.id === id));
    });
    const issues = [...unmatched, ...applied.conflicts];
    return { summary: { matched: quotes.size - applied.conflicts.length, updated: applied.changed.length, unmatched: issues.length }, issues, data: { portfolio: await records.holdings.listAll(userId) } };
  }

  async function syncCalendarRows(userId, connector, config, result) {
    const summary = { events: 0, added: 0, updated: 0, removed: 0, skipped: result.skipped.length, outsideWindow: result.outsideWindow };
    const issues = [...result.skipped];
    await transactionWithRetry(prisma, async tx => {
      Object.assign(summary, { events: 0, added: 0, updated: 0, removed: 0, skipped: result.skipped.length });
      issues.length = result.skipped.length;
      const kept = new Set();
      for (const event of result.events) {
        try {
          const outcome = await records.calendar.systemPut(tx, userId, { ...event, syncLabel: config.label }, { syncProvider: connector.key });
          kept.add(event.id); summary.events += 1;
          if (outcome === 'added') summary.added += 1; else if (outcome === 'updated') summary.updated += 1;
        } catch (error) {
          if (error.status !== 400) throw error;
          summary.skipped += 1; issues.push({ title: event.title, reason: error.message });
        }
      }
      for (const id of await records.calendar.syncedIds(tx, userId, connector.key)) {
        if (!kept.has(id) && await records.calendar.systemRemove(tx, userId, id)) summary.removed += 1;
      }
    });
    return { summary, issues: issues.slice(0, 20), data: { calendar_events: await records.calendar.listAll(userId) } };
  }

  async function syncPortfolio(userId, connector, config, secret, fetchedAt) {
    if (records) return syncPortfolioRows(userId, connector, config, secret, fetchedAt);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { portfolio: true } });
    const holdings = parseArray(user?.portfolio);
    const { quotes, unmatched } = await connector.quotes({ holdings, config, secret, fetchJson: getJson, now: now() });
    if (!quotes.size) return { summary: { matched: 0, updated: 0, unmatched: unmatched.length }, issues: unmatched, data: null };
    let applied;
    // Re-read inside the transaction so an edit made during the fetch survives.
    await transactionWithRetry(prisma, async tx => {
      const fresh = await tx.user.findUnique({ where: { id: userId }, select: { portfolio: true } });
      applied = applyQuotes(parseArray(fresh?.portfolio), quotes, fetchedAt);
      await tx.user.update({ where: { id: userId }, data: { portfolio: JSON.stringify(applied.holdings) } });
    });
    const issues = [...unmatched, ...applied.conflicts];
    return { summary: { matched: quotes.size - applied.conflicts.length, updated: applied.changed.length, unmatched: issues.length }, issues, data: { portfolio: applied.holdings } };
  }

  async function syncCalendar(userId, connector, config, secret) {
    const idFor = uid => `ics-${crypto.createHash('sha256').update(`${userId}:${connector.key}:${uid}`).digest('hex').slice(0, 32)}`;
    const result = await connector.events({ secret, config, fetchText: getText, idFor, now: now(), timeZone: config.timeZone || 'UTC' });
    if (records) return syncCalendarRows(userId, connector, config, result);
    let summary; let next;
    await transactionWithRetry(prisma, async tx => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { calendarEvents: true } });
      const events = parseArray(user?.calendarEvents);
      const previous = new Map(events.filter(event => event?.syncProvider === connector.key).map(event => [event.id, JSON.stringify(event)]));
      const incoming = result.events.map(event => ({ ...event, syncProvider: connector.key, syncLabel: config.label, readOnly: true }));
      next = [...events.filter(event => event?.syncProvider !== connector.key), ...incoming];
      const added = incoming.filter(event => !previous.has(event.id)).length;
      const updated = incoming.filter(event => previous.has(event.id) && previous.get(event.id) !== JSON.stringify(event)).length;
      const ids = new Set(incoming.map(event => event.id));
      summary = { events: incoming.length, added, updated, removed: [...previous.keys()].filter(id => !ids.has(id)).length,
        skipped: result.skipped.length, outsideWindow: result.outsideWindow };
      await tx.user.update({ where: { id: userId }, data: { calendarEvents: JSON.stringify(next) } });
    });
    return { summary, issues: result.skipped.slice(0, 20), data: { calendar_events: next } };
  }

  async function run(userId, key, { trigger = 'manual' } = {}) {
    const connector = byKey(key);
    const lock = context(userId, key);
    if (inflight.has(lock)) throw domainError(409, 'SYNC_IN_PROGRESS', 'This connector is already syncing.');
    inflight.add(lock);
    const startedAt = now();
    try {
      const row = await findRow(userId, key);
      if (!row) throw domainError(404, 'CONNECTION_NOT_FOUND', 'Connect this source before syncing.');
      const state = readState(row, key);
      const secret = connector.requiresSecret ? readSecret(row, key) : null;
      if (connector.requiresSecret && !secret) throw domainError(409, 'CONNECTION_INCOMPLETE', 'Reconnect this source to supply its secret.');
      let outcome; let failure = null;
      try {
        outcome = connector.target === 'calendar'
          ? await syncCalendar(userId, connector, state.config || {}, secret)
          : await syncPortfolio(userId, connector, state.config || {}, secret, startedAt.toISOString());
      } catch (error) { failure = error; }
      const status = failure ? 'failed' : outcome.issues.length ? 'partial' : 'success';
      const lastRun = { status, trigger, at: startedAt.toISOString(), durationMs: now() - startedAt,
        summary: outcome?.summary || null, message: failure ? (failure.status ? failure.message : 'The sync could not be completed.') : null };
      await prisma.integrationCredential.update({ where: { userId_provider: { userId, provider: key } }, data: {
        lastSyncAt: startedAt, clientIdCiphertext: sealer.seal({ ...state, lastRun }, `${lock}:state`) } });
      await logEvent({ category: 'sync', action: `sync.${status}`, severity: failure ? 'warning' : 'info', table_name: 'sync', item_id: key, user_id: userId,
        details: { trigger, summary: lastRun.summary, message: lastRun.message } });
      if (failure) throw failure;
      return { connector: key, status, ...lastRun, issues: outcome.issues, data: outcome.data };
    } finally { inflight.delete(lock); }
  }

  async function runTarget(userId, target, options) {
    const rows = await prisma.integrationCredential.findMany({ where: { userId, enabled: true, provider: { in: connectors.filter(item => item.target === target).map(item => item.key) } } });
    const results = [];
    for (const row of rows) {
      try { results.push(await run(userId, row.provider, options)); }
      catch (error) { results.push({ connector: row.provider, status: 'failed', message: error.status ? error.message : 'The sync could not be completed.' }); }
    }
    return results;
  }

  /** Scheduled pass: each connection syncs when its interval has elapsed.
      lastSyncAt records attempts, so a failing provider is not hammered. */
  async function runDue() {
    const rows = await prisma.integrationCredential.findMany({ where: { enabled: true, provider: { in: connectors.map(item => item.key) } } });
    const results = [];
    for (const row of rows) {
      const connector = byKey(row.provider);
      let state;
      try { state = readState(row, row.provider); } catch { continue; }
      if (state.autoSync === false) continue;
      const elapsed = row.lastSyncAt ? now() - new Date(row.lastSyncAt) : Infinity;
      if (elapsed < connector.autoSyncMinutes * 60_000) continue;
      try { results.push(await run(row.userId, row.provider, { trigger: 'schedule' })); }
      catch (error) { results.push({ connector: row.provider, status: 'failed', message: error.message }); }
    }
    return results;
  }

  return { list, connect, disconnect, run, runTarget, runDue };
}

export function registerSyncRoutes(app, auth, engine) {
  const wrap = handler => async (req, res) => {
    try { req.auditWritten = true; res.setHeader('Cache-Control', 'private, no-store'); return await handler(req, res); }
    catch (error) { return sendDomainError(res, error); }
  };
  app.get('/api/v1/sync/connectors', auth, wrap(async (req, res) => res.json({ connectors: await engine.list(req.user.id) })));
  app.put('/api/v1/sync/connections/:key', auth, wrap(async (req, res) => {
    const connection = await engine.connect(req.user.id, req.params.key, req.body || {});
    if (req.body?.runNow === false) return res.json({ connection });
    try { return res.json({ connection, run: await engine.run(req.user.id, req.params.key, { trigger: 'connect' }) }); }
    catch (error) { return res.json({ connection, run: { status: 'failed', message: error.status ? error.message : 'The first sync could not be completed.' } }); }
  }));
  app.delete('/api/v1/sync/connections/:key', auth, wrap(async (req, res) => res.json(await engine.disconnect(req.user.id, req.params.key, { removeData: req.query.removeData === 'true' }))));
  app.post('/api/v1/sync/connections/:key/run', auth, wrap(async (req, res) => res.json(await engine.run(req.user.id, req.params.key))));
  app.post('/api/v1/sync/run', auth, wrap(async (req, res) => {
    const target = req.body?.target;
    if (!['portfolio', 'calendar'].includes(target)) throw domainError(400, 'INVALID_TARGET', 'target must be portfolio or calendar.');
    res.json({ results: await engine.runTarget(req.user.id, target) });
  }));
}

export function startSyncScheduler(engine, { intervalMs = DEFAULT_CONFIG.sync.scheduler.intervalMs, firstRunMs = DEFAULT_CONFIG.sync.scheduler.firstRunMs, onError = () => {} } = {}) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await engine.runDue(); } catch (error) { onError(error); } finally { running = false; }
  };
  const first = setTimeout(tick, firstRunMs);
  const timer = setInterval(tick, intervalMs);
  first.unref?.(); timer.unref?.();
  return () => { clearTimeout(first); clearInterval(timer); };
}
