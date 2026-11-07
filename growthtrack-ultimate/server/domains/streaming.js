import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { createSealer } from './sync/sealer.js';
import { domainError, sendDomainError, transactionWithRetry } from './errors.js';

export const STREAMING_PROVIDERS = Object.freeze([
  { id: 'netflix', name: 'Netflix', method: 'CSV import + custom webhook', docs: 'https://help.netflix.com/en/node/101917' },
  { id: 'prime-video', name: 'Prime Video', method: 'Custom webhook / normalized CSV' },
  { id: 'crunchyroll', name: 'Crunchyroll', method: 'Custom webhook / normalized CSV' },
  { id: 'jiohotstar', name: 'JioHotstar', method: 'Custom webhook / normalized CSV' },
  { id: 'sonyliv', name: 'SonyLIV', method: 'Custom webhook / normalized CSV' },
  { id: 'zee5', name: 'ZEE5', method: 'Custom webhook / normalized CSV' },
  { id: 'youtube', name: 'YouTube', method: 'Custom webhook / normalized CSV' },
  { id: 'apple-tv', name: 'Apple TV', method: 'Custom webhook / normalized CSV' },
  { id: 'custom', name: 'Other player', method: 'Custom webhook / normalized CSV' },
]);
const invalid = message => { throw domainError(400, 'INVALID_WATCH_EVENT', message); };
const providerName = id => {
  const provider = STREAMING_PROVIDERS.find(item => item.id === id);
  if (!provider) throw domainError(404, 'UNKNOWN_STREAMING_PROVIDER', 'Unknown streaming provider.');
  return provider.name;
};
const digest = value => createHash('sha256').update(value).digest('hex');
const recordId = (owner, provider, id) => {
  const hex = digest(JSON.stringify(['growthtrack-watch-v1', owner, provider, id]));
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
};
export function normalizeWatchEvent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('Send a watch-event object.');
  const allowed = ['id', 'title', 'watchedAt', 'type', 'season', 'episode', 'durationMinutes', 'status'];
  if (Object.keys(value).some(key => !allowed.includes(key))) invalid('The event contains unsupported fields.');
  for (const [key, max] of [['id', 160], ['title', 300]]) {
    if (typeof value[key] !== 'string' || !value[key].trim() || value[key].length > max || /[\x00-\x1f]/.test(value[key])) invalid(`Provide a valid ${key} (up to ${max} characters).`);
  }
  if (typeof value.watchedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value.watchedAt) || !Number.isFinite(Date.parse(value.watchedAt))) invalid('Use an ISO date or timestamp with a timezone for watchedAt.');
  const day = value.watchedAt.slice(0, 10);
  if (new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) invalid('The watched date does not exist.');
  const event = { id: value.id.trim(), title: value.title.trim(), watchedAt: value.watchedAt };
  if (value.type != null) {
    if (!['Anime', 'Series', 'Movie', 'Documentary', 'YouTube'].includes(value.type)) invalid('Choose a supported media type.');
    event.type = value.type;
  }
  if (value.status != null) {
    if (!['Watching', 'Completed', 'Dropped', 'Plan to Watch'].includes(value.status)) invalid('Choose a supported watch status.');
    event.status = value.status;
  }
  for (const field of ['season', 'episode', 'durationMinutes']) if (value[field] != null) {
    if (typeof value[field] !== 'number' || !Number.isFinite(value[field]) || value[field] < (field === 'season' ? 1 : 0) || value[field] > (field === 'durationMinutes' ? 10080 : 100000) || (field !== 'durationMinutes' && !Number.isInteger(value[field]))) invalid(`Invalid ${field}.`);
    event[field] = value[field];
  }
  return event;
}

/** Bounded RFC4180-style CSV; exported values are never evaluated as formulas. */
function csvRows(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 512 * 1024) invalid('CSV must be at most 512 KB.');
  const rows = []; let row = [], cell = '', quoted = false, closed = false;
  const push = () => { row.push(cell); if (row.some(value => value.trim())) rows.push(row); row = []; cell = ''; closed = false; if (rows.length > 501) invalid('Import at most 500 rows at a time.'); };
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === '"') { if (cell || closed) invalid('Invalid CSV quoting.'); quoted = true; }
    else if (char === ',') { row.push(cell); cell = ''; closed = false; }
    else if (char === '\r' || char === '\n') { if (char === '\r' && text[i + 1] === '\n') i++; push(); }
    else { if (closed && !/\s/.test(char)) invalid('Invalid text after CSV quote.'); if (!closed) cell += char; }
    if (cell.length > 2000 || row.length > 15) invalid('CSV cell or column limit exceeded.');
  }
  if (quoted) invalid('Unclosed CSV quote.');
  if (cell || row.length || closed) push();
  if (rows.length < 2) invalid('CSV needs headers and at least one event.');
  return rows;
}
export function parseWatchCsv(csv, provider, dateFormat = 'ISO') {
  providerName(provider);
  const [headers, ...rows] = csvRows(csv);
  const keys = headers.map(key => key.trim().toLowerCase());
  if (new Set(keys).size !== keys.length) invalid('CSV headers must be unique.');
  const netflix = provider === 'netflix' && keys.includes('title') && keys.includes('date') && !keys.includes('watchedat');
  if (!keys.includes('title') || !keys.includes(netflix ? 'date' : 'watchedat')) invalid('Use Title,Date for Netflix or title,watchedAt for normalized CSV.');
  if (!['ISO', 'MDY', 'DMY'].includes(dateFormat)) invalid('Choose ISO, MDY or DMY date format.');
  return rows.map((cells, index) => {
    if (cells.length !== keys.length) invalid(`Row ${index + 2} has the wrong number of columns.`);
    const data = Object.fromEntries(keys.map((key, n) => [key, cells[n].trim()]));
    let watchedAt = data.watchedat || data.date;
    if (netflix && dateFormat !== 'ISO') {
      const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(watchedAt);
      if (!match) invalid(`Row ${index + 2}: choose the date format used by your Netflix export.`);
      let [, first, second, year] = match;
      if (year.length === 2) year = `20${year}`;
      watchedAt = `${year}-${(dateFormat === 'MDY' ? first : second).padStart(2, '0')}-${(dateFormat === 'MDY' ? second : first).padStart(2, '0')}`;
    }
    const event = { id: data.id || `csv:${digest(JSON.stringify([data.title, watchedAt]))}`, title: data.title, watchedAt };
    for (const field of ['type', 'status']) if (data[field]) event[field] = data[field];
    for (const [key, field] of [['season', 'season'], ['episode', 'episode'], ['durationminutes', 'durationMinutes']]) if (data[key]) event[field] = Number(data[key]);
    return normalizeWatchEvent(event);
  });
}

export function registerStreamingRoutes(app, auth, { prisma, config }) {
  const base = '/api/integrations/streaming';
  const sealer = createSealer(config.security.encryptionKey);
  const key = provider => `streaming:${provider}`;
  const context = (owner, provider) => `${owner}:${key(provider)}:webhook`;
  const find = (owner, provider) => prisma.integrationCredential.findUnique({ where: { userId_provider: { userId: owner, provider: key(provider) } } });
  const wrap = handler => async (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    try { await handler(req, res); } catch (error) { sendDomainError(res, error); }
  };
  async function persist(owner, provider, events) {
    const platform = providerName(provider);
    return transactionWithRetry(prisma, async tx => {
      let imported = 0, duplicates = 0;
      for (const event of events) {
        const id = recordId(owner, provider, event.id);
        if (await tx.entertainmentMedia.findUnique({ where: { id }, select: { id: true } })) { duplicates++; continue; }
        await tx.entertainmentMedia.create({ data: { id, userId: owner, progress: 'streaming-watch-event-v1', title: event.title, type: event.type ?? null, status: event.status ?? null,
          season: event.season ?? null, episode: event.episode ?? null,
          data: JSON.stringify({ platform, watchedAt: event.watchedAt, source: key(provider), externalEventId: event.id, ...(event.durationMinutes != null ? { durationMinutes: event.durationMinutes } : {}) }) } });
        imported++;
      }
      return { imported, duplicates };
    });
  }
  app.get(base, auth, wrap(async (req, res) => {
    const providers = await Promise.all(STREAMING_PROVIDERS.map(async provider => {
      const row = await find(req.user.id, provider.id);
      return { ...provider, webhookEnabled: Boolean(row?.enabled), endpoint: `${base}/${provider.id}/webhook/${encodeURIComponent(req.user.id)}`, nativeSync: false };
    }));
    res.json({ providers, encryptionReady: sealer.canSeal });
  }));
  app.get(`${base}/:provider/history`, auth, wrap(async (req, res) => {
    const provider = req.params.provider; providerName(provider);
    const where = { userId: req.user.id, progress: 'streaming-watch-event-v1', data: { contains: `"source":"${key(provider)}"` } };
    const [count, rows] = await Promise.all([prisma.entertainmentMedia.count({ where }), prisma.entertainmentMedia.findMany({ where, take: 100, orderBy: { createdAt: 'desc' } })]);
    res.json({ count, events: rows.map(row => ({ id: row.id, title: row.title, type: row.type, ...JSON.parse(row.data) })), truncated: count > rows.length });
  }));
  app.post(`${base}/:provider/connection`, auth, wrap(async (req, res) => {
    const provider = req.params.provider; providerName(provider);
    const secret = randomBytes(32).toString('hex');
    const data = { enabled: true, accessTokenCiphertext: sealer.seal(secret, context(req.user.id, provider), { requireEncryption: true }) };
    await prisma.integrationCredential.upsert({ where: { userId_provider: { userId: req.user.id, provider: key(provider) } }, create: { userId: req.user.id, provider: key(provider), ...data }, update: data });
    res.json({ secret, webhookEnabled: true, endpoint: `${base}/${provider}/webhook/${encodeURIComponent(req.user.id)}` });
  }));
  app.delete(`${base}/:provider/connection`, auth, wrap(async (req, res) => {
    providerName(req.params.provider);
    await prisma.integrationCredential.deleteMany({ where: { userId: req.user.id, provider: key(req.params.provider) } });
    res.json({ webhookEnabled: false });
  }));
  app.post(`${base}/:provider/import`, auth, wrap(async (req, res) => {
    const events = parseWatchCsv(req.body?.csv, req.params.provider, req.body?.dateFormat);
    if (req.body?.commit !== true) return res.json({ count: events.length, preview: events.slice(0, 10), warning: 'Missing type, status and duration stay unknown. Each event is a history entry, not an aggregate series-progress update.' });
    res.json(await persist(req.user.id, req.params.provider, events));
  }));
  // Raw bytes are captured before express.json. Authentication is a per-owner,
  // per-provider HMAC grant, not a browser cookie or provider password.
  app.post(`${base}/:provider/webhook/:owner`, wrap(async (req, res) => {
    const { provider, owner } = req.params; providerName(provider);
    if (owner.length > 128) throw domainError(401, 'INVALID_SIGNATURE', 'Invalid webhook signature.');
    const row = await find(owner, provider);
    const timestamp = req.headers['x-growthtrack-timestamp'];
    const signature = req.headers['x-growthtrack-signature'];
    if (!row?.enabled || !Buffer.isBuffer(req.body) || typeof timestamp !== 'string' || !/^\d{10}$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 || typeof signature !== 'string' || !/^[a-f0-9]{64}$/.test(signature)) throw domainError(401, 'INVALID_SIGNATURE', 'Invalid or expired webhook signature.');
    const secret = sealer.open(row.accessTokenCiphertext, context(owner, provider));
    const expected = createHmac('sha256', secret).update(timestamp).update('.').update(req.body).digest();
    if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) throw domainError(401, 'INVALID_SIGNATURE', 'Invalid webhook signature.');
    let event; try { event = JSON.parse(req.body.toString('utf8')); } catch { invalid('Invalid event JSON.'); }
    res.json(await persist(owner, provider, [normalizeWatchEvent(event)]));
  }));
}
