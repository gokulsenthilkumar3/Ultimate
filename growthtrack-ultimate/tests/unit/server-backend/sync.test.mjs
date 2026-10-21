import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createSealer } from '../../../server/domains/sync/sealer.js';
import { isPublicAddress, normalizeFeedUrl, safeFetchText } from '../../../server/domains/sync/safeFetch.js';
import { readCalendarFeed, simplifyRule } from '../../../server/domains/sync/icsFeed.js';
import { connectorByKey, mutualFundCode, coingeckoId } from '../../../server/domains/sync/connectors.js';
import { applyQuotes, createSyncEngine } from '../../../server/domains/sync/engine.js';

const KEY = 'a'.repeat(64);
const clone = value => value == null ? value : structuredClone(value);

function fakePrisma(users) {
  const credentials = new Map();
  const id = (userId, provider) => `${userId}:${provider}`;
  const prisma = {
    user: {
      findUnique: async ({ where }) => clone(users.get(where.id)) ?? null,
      update: async ({ where, data }) => { Object.assign(users.get(where.id), data); return clone(users.get(where.id)); },
    },
    integrationCredential: {
      findUnique: async ({ where: { userId_provider: key } }) => clone(credentials.get(id(key.userId, key.provider))) ?? null,
      findMany: async ({ where }) => [...credentials.values()].filter(row => (!where.userId || row.userId === where.userId)
        && (where.enabled === undefined || row.enabled === where.enabled) && (!where.provider?.in || where.provider.in.includes(row.provider))).map(clone),
      upsert: async ({ where: { userId_provider: key }, create, update }) => {
        const current = credentials.get(id(key.userId, key.provider));
        const row = current ? { ...current, ...update } : { id: crypto.randomUUID(), lastSyncAt: null, ...create };
        credentials.set(id(key.userId, key.provider), row);
        return clone(row);
      },
      update: async ({ where: { userId_provider: key }, data }) => {
        const row = { ...credentials.get(id(key.userId, key.provider)), ...data };
        credentials.set(id(key.userId, key.provider), row);
        return clone(row);
      },
      delete: async ({ where: { userId_provider: key } }) => { credentials.delete(id(key.userId, key.provider)); return {}; },
    },
    $transaction: async work => work(prisma),
  };
  return { prisma, credentials };
}

const holding = { id: 'mf-1', name: 'Index fund', symbol: '120716', type: 'Mutual Fund', units: 10, buyPrice: 100, currentPrice: 90, buyDate: '2026-01-02' };
const navResponse = { meta: { scheme_name: 'Index Fund Direct Growth' }, data: [{ date: '16-10-2026', nav: '123.4567' }], status: 'SUCCESS' };

const feed = (...events) => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Google Inc//Google Calendar 70.9054//EN', 'X-WR-CALNAME:Work',
  'BEGIN:VTIMEZONE', 'TZID:Asia/Kolkata', 'BEGIN:STANDARD', 'TZOFFSETFROM:+0530', 'TZOFFSETTO:+0530', 'DTSTART:19700101T000000', 'END:STANDARD', 'END:VTIMEZONE',
  ...events.flat(), 'END:VCALENDAR'].join('\r\n');
const vevent = (uid, lines) => ['BEGIN:VEVENT', `UID:${uid}`, 'DTSTAMP:20261015T080000Z', ...lines, 'END:VEVENT'];

test('sealer round-trips bound state, refuses secrets without a key and detects tampering', () => {
  const sealer = createSealer(KEY);
  const sealed = sealer.seal({ url: 'https://example.com/a.ics' }, 'owner-a:ics:secret');
  assert.match(sealed, /^gcm1:/);
  assert.deepEqual(sealer.open(sealed, 'owner-a:ics:secret'), { url: 'https://example.com/a.ics' });
  assert.throws(() => sealer.open(sealed, 'owner-b:ics:secret'), { status: 410 });
  assert.throws(() => createSealer('b'.repeat(64)).open(sealed, 'owner-a:ics:secret'), { code: 'ENCRYPTION_KEY_REQUIRED' });
  const plain = createSealer(undefined);
  assert.deepEqual(plain.open(plain.seal({ autoSync: true }, 'ctx'), 'ctx'), { autoSync: true });
  assert.throws(() => plain.seal({ apiKey: 'x' }, 'ctx', { requireEncryption: true }), { status: 503, code: 'ENCRYPTION_KEY_REQUIRED' });
  assert.throws(() => createSealer('short'), /64 hexadecimal/);
});

test('feed URLs must be public HTTPS hosts', async () => {
  for (const address of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '::1', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1']) assert.equal(isPublicAddress(address), false, address);
  for (const address of ['8.8.8.8', '142.250.183.14', '2606:4700::1111']) assert.equal(isPublicAddress(address), true, address);
  assert.equal(normalizeFeedUrl('webcal://calendar.example.com/feed.ics').href, 'https://calendar.example.com/feed.ics');
  for (const url of ['http://calendar.example.com/a.ics', 'https://localhost/a.ics', 'https://127.0.0.1/a.ics', 'https://[::1]/a.ics',
    'https://10.0.0.5/a.ics', 'https://intranet/a.ics', 'https://printer.local/a.ics', 'https://example.com:8443/a.ics', 'https://user:pw@example.com/a.ics', 'not a url']) {
    assert.throws(() => normalizeFeedUrl(url), { status: 400 }, url);
  }
  // A public-looking name that resolves privately is refused at connection time.
  const lookup = (_host, _options, callback) => callback(null, [{ address: '10.0.0.7', family: 4 }]);
  await assert.rejects(safeFetchText('https://rebind.example.com/a.ics', { lookup }), { code: 'PRIVATE_ADDRESS' });
  await assert.rejects(safeFetchText('https://evil.example.com/x', { allowHosts: ['api.mfapi.in'] }), { code: 'HOST_NOT_ALLOWED' });
});

test('calendar feeds keep supported events and report the rest without failing', () => {
  const now = new Date('2026-10-18T00:00:00Z');
  const idFor = uid => `id-${uid}`;
  const text = feed(
    vevent('standup', ['DTSTART;TZID=Asia/Kolkata:20261019T093000', 'DTEND;TZID=Asia/Kolkata:20261019T094500', 'RRULE:FREQ=WEEKLY;BYDAY=MO;WKST=SU',
      'SUMMARY:Standup', 'ORGANIZER;CN=Lead:mailto:lead@example.com', 'ATTENDEE;CN=Me:mailto:me@example.com', 'STATUS:CONFIRMED',
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:-PT10M', 'END:VALARM']),
    vevent('offsite', ['DTSTART;VALUE=DATE:20261105', 'DTEND;VALUE=DATE:20261107', 'SUMMARY:Offsite', 'LOCATION:Goa']),
    vevent('complex', ['DTSTART:20261020T100000Z', 'DTEND:20261020T110000Z', 'RRULE:FREQ=WEEKLY;BYDAY=TU,TH', 'SUMMARY:Gym']),
    vevent('moved', ['DTSTART:20261026T100000Z', 'RECURRENCE-ID:20261026T093000Z', 'SUMMARY:Standup moved']),
    vevent('cancelled', ['DTSTART:20261021T100000Z', 'STATUS:CANCELLED', 'SUMMARY:Gone']),
    vevent('ancient', ['DTSTART:20200101T100000Z', 'SUMMARY:Old']),
    vevent('windows-zone', ['DTSTART;TZID=India Standard Time:20261022T100000', 'SUMMARY:Outlook meeting']));
  const result = readCalendarFeed(text, { idFor, now });
  assert.deepEqual(result.events.map(event => event.title), ['Standup', 'Offsite']);
  const standup = result.events[0];
  assert.equal(standup.id, 'id-standup');
  assert.equal(standup.recurrence, 'weekly');
  assert.match(standup.timeZone, /^Asia\/(?:Kolkata|Calcutta)$/, 'ICU may report either IANA alias');
  assert.equal(standup.startTime, '09:30');
  assert.equal(result.events[1].endDate, '2026-11-06');
  assert.deepEqual(result.skipped.map(item => item.title), ['Gym', 'Standup moved', 'Outlook meeting']);
  assert.equal(result.outsideWindow, 1);
  assert.throws(() => readCalendarFeed('<html>login</html>', { idFor, now }), { code: 'FEED_INVALID' });
  assert.equal(simplifyRule('FREQ=MONTHLY;BYMONTHDAY=15', '2026-10-15'), 'FREQ=MONTHLY');
  assert.equal(simplifyRule('FREQ=DAILY;COUNT=5', '2026-10-15'), null);
});

test('portfolio connectors return dated quotes and explain unmatched holdings', async () => {
  assert.equal(mutualFundCode(holding), '120716');
  assert.equal(mutualFundCode({ ...holding, symbol: 'NIFTYBEES' }), null);
  assert.equal(coingeckoId({ type: 'Crypto', symbol: 'btc' }), 'bitcoin');
  assert.equal(coingeckoId({ type: 'Crypto', symbol: 'ZZZ', coingeckoId: 'zzz-token' }), 'zzz-token');
  const requested = [];
  const fetchJson = async (url, options) => { requested.push({ url, hosts: options.allowHosts }); return navResponse; };
  const mf = await connectorByKey('mfapi').quotes({ holdings: [holding, { ...holding, id: 'mf-2', symbol: '' }], fetchJson });
  assert.deepEqual(mf.quotes.get('mf-1'), { price: 123.4567, date: '2026-10-16', currency: 'INR', source: 'mfapi.in', reference: 'AMFI 120716', label: 'Index Fund Direct Growth' });
  assert.equal(mf.unmatched[0].id, 'mf-2');
  assert.deepEqual(requested[0], { url: 'https://api.mfapi.in/mf/120716/latest', hosts: ['api.mfapi.in'] });

  const crypto = await connectorByKey('coingecko').quotes({ holdings: [{ id: 'c1', name: 'Bitcoin', type: 'Crypto', symbol: 'BTC' }],
    config: { currency: 'INR' }, fetchJson: async () => ({ bitcoin: { inr: 5_500_000, last_updated_at: Date.parse('2026-10-17T12:00:00Z') / 1000 } }) });
  assert.deepEqual(crypto.quotes.get('c1'), { price: 5_500_000, date: '2026-10-17', currency: 'INR', source: 'CoinGecko', reference: 'bitcoin' });

  const limited = await connectorByKey('alphavantage').quotes({ holdings: [{ id: 's1', name: 'Reliance', type: 'Stock', symbol: 'RELIANCE.BSE' }],
    secret: { apiKey: 'DEMOKEY123' }, fetchJson: async () => ({ Note: 'Thank you for using Alpha Vantage' }) });
  assert.equal(limited.quotes.size, 0);
  assert.match(limited.unmatched[0].reason, /rate limit/);
  assert.throws(() => connectorByKey('alphavantage').normalize({ apiKey: '' }), { code: 'INVALID_CONFIG' });
});

test('applying quotes appends bounded history and refuses currency mismatches', () => {
  const quotes = new Map([['mf-1', { price: 123.45, date: '2026-10-16', currency: 'INR', source: 'mfapi.in' }], ['usd', { price: 10, date: '2026-10-16', currency: 'INR', source: 'mfapi.in' }]]);
  const result = applyQuotes([holding, { ...holding, id: 'usd', currency: 'USD' }], quotes, '2026-10-18T00:00:00.000Z');
  const [updated, untouched] = result.holdings;
  assert.equal(updated.currentPrice, 123.45);
  assert.equal(updated.priceDate, '2026-10-16');
  assert.equal(updated.quote.source, 'mfapi.in');
  assert.deepEqual(updated.priceHistory, [{ date: '2026-10-16', price: 123.45, currency: 'INR', provenance: 'mfapi.in' }]);
  assert.equal(untouched.currentPrice, 90);
  assert.deepEqual(result.changed, ['mf-1']);
  assert.equal(result.conflicts[0].id, 'usd');
  const again = applyQuotes(result.holdings, quotes, '2026-10-19T00:00:00.000Z');
  assert.equal(again.holdings[0].priceHistory.length, 1, 'same-day quote replaces rather than duplicates');
  assert.deepEqual(again.changed, []);
});

test('engine syncs a portfolio without overwriting edits made during the fetch', async () => {
  const users = new Map([['owner-a', { id: 'owner-a', portfolio: JSON.stringify([holding]) }], ['owner-b', { id: 'owner-b', portfolio: '[]' }]]);
  const { prisma } = fakePrisma(users);
  const events = [];
  const fetchJson = async () => {
    // The owner renames the holding while the provider request is in flight.
    users.get('owner-a').portfolio = JSON.stringify([{ ...holding, name: 'Renamed during sync' }]);
    return navResponse;
  };
  const engine = createSyncEngine({ prisma, sealer: createSealer(undefined), fetchJson, logEvent: async event => events.push(event), now: () => new Date('2026-10-18T00:00:00Z') });
  const connected = await engine.connect('owner-a', 'mfapi', { config: {} });
  assert.equal(connected.status, 'connected');
  const run = await engine.run('owner-a', 'mfapi');
  assert.equal(run.status, 'success');
  assert.deepEqual(run.summary, { matched: 1, updated: 1, unmatched: 0 });
  const stored = JSON.parse(users.get('owner-a').portfolio)[0];
  assert.equal(stored.name, 'Renamed during sync');
  assert.equal(stored.currentPrice, 123.4567);
  assert.equal(run.data.portfolio[0].name, 'Renamed during sync');
  assert.equal((await engine.list('owner-a')).find(item => item.key === 'mfapi').connection.lastRun.status, 'success');
  assert.equal((await engine.list('owner-b')).find(item => item.key === 'mfapi').status, 'available', 'connections are owner-scoped');
  await assert.rejects(engine.run('owner-b', 'mfapi'), { status: 404 });
  assert.deepEqual(events.map(event => event.action), ['sync.connect', 'sync.success']);
});

test('calendar sync replaces only its own events and secrets require a key', async () => {
  const userEvent = { id: 'mine', title: 'Dentist', date: '2026-10-20', allDay: true, recurrence: 'none' };
  const users = new Map([['owner-a', { id: 'owner-a', calendarEvents: JSON.stringify([userEvent]) }]]);
  const { prisma, credentials } = fakePrisma(users);
  let body = feed(vevent('one', ['DTSTART;VALUE=DATE:20261101', 'SUMMARY:Team day']), vevent('two', ['DTSTART;VALUE=DATE:20261102', 'SUMMARY:Review']));
  const fetchText = async url => { assert.equal(url, 'https://calendar.example.com/private/basic.ics'); return body; };
  const noKey = createSyncEngine({ prisma, sealer: createSealer(undefined), fetchText });
  await assert.rejects(noKey.connect('owner-a', 'ics', { config: { url: 'https://calendar.example.com/private/basic.ics' } }), { code: 'ENCRYPTION_KEY_REQUIRED' });
  assert.equal((await noKey.list('owner-a')).find(item => item.key === 'ics').status, 'needs-key');

  const engine = createSyncEngine({ prisma, sealer: createSealer(KEY), fetchText, now: () => new Date('2026-10-18T00:00:00Z') });
  await engine.connect('owner-a', 'ics', { config: { url: 'webcal://calendar.example.com/private/basic.ics', label: 'Work' }, timeZone: 'Asia/Kolkata' });
  const stored = [...credentials.values()][0];
  assert.doesNotMatch(JSON.stringify(stored), /calendar\.example\.com/, 'the feed address is never stored in plain text');
  const listed = (await engine.list('owner-a')).find(item => item.key === 'ics');
  assert.equal(listed.connection.hasSecret, true);
  assert.equal(listed.connection.config.timeZone, 'Asia/Kolkata');
  assert.equal(JSON.stringify(listed).includes('private/basic.ics'), false, 'listing never returns the secret');

  const first = await engine.run('owner-a', 'ics');
  assert.deepEqual(first.summary, { events: 2, added: 2, updated: 0, removed: 0, skipped: 0, outsideWindow: 0 });
  body = feed(vevent('one', ['DTSTART;VALUE=DATE:20261101', 'SUMMARY:Team day (moved room)']));
  const second = await engine.run('owner-a', 'ics');
  assert.deepEqual(second.summary, { events: 1, added: 0, updated: 1, removed: 1, skipped: 0, outsideWindow: 0 });
  const events = JSON.parse(users.get('owner-a').calendarEvents);
  assert.deepEqual(events.map(event => event.title), ['Dentist', 'Team day (moved room)']);
  assert.equal(events[1].readOnly, true);
  assert.equal(events[1].syncLabel, 'Work');

  // Reconfiguring without re-entering the secret keeps the existing address.
  await engine.connect('owner-a', 'ics', { config: { label: 'Work (renamed)' } });
  assert.equal((await engine.run('owner-a', 'ics')).status, 'success');

  const removed = await engine.disconnect('owner-a', 'ics', { removeData: true });
  assert.equal(removed.removed, 1);
  assert.deepEqual(JSON.parse(users.get('owner-a').calendarEvents), [userEvent]);
  assert.equal(credentials.size, 0);
});

test('failed syncs are recorded, concurrent runs are refused and the scheduler honours intervals', async () => {
  const users = new Map([['owner-a', { id: 'owner-a', portfolio: JSON.stringify([holding]) }]]);
  const { prisma } = fakePrisma(users);
  let clock = new Date('2026-10-18T00:00:00Z');
  let release; let calls = 0;
  const fetchJson = async () => { calls += 1; if (release) await release; return navResponse; };
  const engine = createSyncEngine({ prisma, sealer: createSealer(undefined), fetchJson, now: () => clock });
  await engine.connect('owner-a', 'mfapi', {});
  let open; release = new Promise(resolve => { open = resolve; });
  const pending = engine.run('owner-a', 'mfapi');
  await assert.rejects(engine.run('owner-a', 'mfapi'), { status: 409, code: 'SYNC_IN_PROGRESS' });
  open(); release = null;
  await pending;
  assert.equal((await engine.runDue()).length, 0, 'not due inside the six-hour interval');
  clock = new Date(clock.getTime() + 361 * 60_000);
  assert.equal((await engine.runDue())[0].status, 'success');
  await engine.connect('owner-a', 'mfapi', { autoSync: false });
  clock = new Date(clock.getTime() + 24 * 3600_000);
  assert.equal((await engine.runDue()).length, 0, 'auto-sync can be turned off');
  assert.equal(calls, 2);

  const failing = createSyncEngine({ prisma, sealer: createSealer(undefined), fetchJson: async () => { throw Object.assign(new Error('The provider responded with HTTP 503.'), { status: 502 }); }, now: () => clock });
  const result = await failing.run('owner-a', 'mfapi');
  assert.equal(result.status, 'partial', 'a provider error on one holding is reported, not fatal');
  assert.match(result.issues[0].reason, /503/);
});
