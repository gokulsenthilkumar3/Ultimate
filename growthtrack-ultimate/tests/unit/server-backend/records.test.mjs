import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRecordServices, registerRecordRoutes, toClient } from '../../../server/domains/records.js';
import { migrateRecordRowsFile } from '../../../server/domains/recordMigration.js';
import { createSyncEngine } from '../../../server/domains/sync/engine.js';
import { createSealer } from '../../../server/domains/sync/sealer.js';
import { isolatedFixture } from './fixture.mjs';

const migration = await readFile(new URL('../../../prisma/migrations/20261018120000_record_rows/migration.sql', import.meta.url), 'utf8');
const statements = migration.split(';').map(sql => sql.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean);
const holding = { name: 'Index fund', symbol: '120716', type: 'Mutual Fund', units: 10, buyPrice: 100, currentPrice: 90, buyDate: '2026-01-02' };
const event = { title: 'Dentist', date: '2026-10-20', allDay: true, recurrence: 'none' };
const navResponse = { meta: { scheme_name: 'Index Fund' }, data: [{ date: '16-10-2026', nav: '123.4567' }] };
let counter = 0;
const mutation = label => `${label}-${(counter += 1).toString().padStart(4, '0')}`;

async function legacyFixture(t) {
  const result = await isolatedFixture(t);
  await result.prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN "calendarEvents" TEXT');
  await result.prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN "portfolio" TEXT');
  await result.prisma.$executeRawUnsafe(`CREATE TABLE "integration_credentials" (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES "User"(id), provider TEXT NOT NULL, accountName TEXT,
    clientIdCiphertext TEXT, accessTokenCiphertext TEXT, refreshTokenCiphertext TEXT, tokenExpiresAt DATETIME,
    enabled BOOLEAN NOT NULL DEFAULT true, lastSyncAt DATETIME, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, createdBy TEXT, updatedBy TEXT, UNIQUE (userId, provider))`);
  return { ...result, filename: result.url.replace(/^file:/, '') };
}
async function rowFixture(t) {
  const result = await legacyFixture(t);
  await result.prisma.$transaction(async tx => { for (const statement of statements) await tx.$executeRawUnsafe(statement); });
  return { ...result, services: createRecordServices(result.prisma) };
}
const createHolding = (services, owner, id, extra = {}) => services.holdings.create(owner, { id, mutationId: mutation(`create-${id}`), record: { ...holding, ...extra } });

test('migration copies each owner’s JSON verbatim, with parity, and refuses to run twice', async t => {
  const { prisma, filename } = await legacyFixture(t);
  const ownerA = { events: [{ id: 'e2', ...event, color: '#123456' }, { id: 'e1', ...event, title: 'Synced', syncProvider: 'ics', readOnly: true, syncLabel: 'Work' }],
    holdings: [{ id: 'holding-1', ...holding, priceHistory: [{ date: '2026-10-01', price: 88, provenance: 'manual' }] }, { id: 'holding-2', ...holding, name: 'Second' }] };
  await prisma.$executeRawUnsafe('UPDATE "User" SET "calendarEvents" = ?, "portfolio" = ? WHERE id = ?', JSON.stringify(ownerA.events), JSON.stringify(ownerA.holdings), 'owner-a');
  // owner-b reuses holding-1; composite keys keep owners apart.
  await prisma.$executeRawUnsafe('UPDATE "User" SET "portfolio" = ? WHERE id = ?', JSON.stringify([{ id: 'holding-1', ...holding, name: 'Owner B fund' }]), 'owner-b');
  const legacy = await prisma.$queryRawUnsafe('SELECT id, calendarEvents, portfolio FROM "User" ORDER BY id');

  const proof = await migrateRecordRowsFile(filename);
  assert.deepEqual({ owners: proof.owners, events: proof.events, holdings: proof.holdings }, { owners: 2, events: 2, holdings: 3 });
  const services = createRecordServices(prisma);
  const events = await services.calendar.listAll('owner-a');
  assert.deepEqual(events.map(({ revision: _r, updatedAt: _u, ...rest }) => rest), [
    { id: 'e1', ...event, title: 'Synced', syncLabel: 'Work', syncProvider: 'ics', readOnly: true },
    { id: 'e2', ...event, color: '#123456' },
  ]);
  const holdings = await services.holdings.listAll('owner-a');
  assert.deepEqual(holdings.map(row => [row.id, row.name, row.revision]), [['holding-1', 'Index fund', 1], ['holding-2', 'Second', 1]]);
  assert.deepEqual(holdings[0].priceHistory, ownerA.holdings[0].priceHistory);
  assert.equal((await services.holdings.listAll('owner-b'))[0].name, 'Owner B fund');
  assert.deepEqual(await prisma.$queryRawUnsafe('SELECT id, calendarEvents, portfolio FROM "User" ORDER BY id'), legacy, 'legacy JSON is retained as a rollback copy');
  assert.equal((await services.calendar.changes('owner-a')).changes.length, 2);
  await assert.rejects(migrateRecordRowsFile(filename), /already been applied/);
});

test('migration rolls back on unusable legacy data or data changed after rehearsal', async t => {
  const { prisma, filename } = await legacyFixture(t);
  await prisma.$executeRawUnsafe('UPDATE "User" SET "portfolio" = ? WHERE id = ?', JSON.stringify([{ ...holding }]), 'owner-a');
  await assert.rejects(migrateRecordRowsFile(filename), /no usable identifier/);
  await prisma.$executeRawUnsafe('UPDATE "User" SET "portfolio" = ? WHERE id = ?', JSON.stringify([{ id: 'x', ...holding }, { id: 'x', ...holding }]), 'owner-a');
  await assert.rejects(migrateRecordRowsFile(filename), /repeats the identifier/);
  await prisma.$executeRawUnsafe('UPDATE "User" SET "portfolio" = ? WHERE id = ?', '{not json', 'owner-a');
  await assert.rejects(migrateRecordRowsFile(filename), /not valid JSON/);
  const tables = await prisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE name = 'portfolio_holdings'");
  assert.equal(tables.length, 0, 'failed migrations leave no partial schema');
  await prisma.$executeRawUnsafe('UPDATE "User" SET "portfolio" = NULL WHERE id = ?', 'owner-a');
  await assert.rejects(migrateRecordRowsFile(filename, 'stale-hash'), /changed after the backup/);
});

test('owner writes require the current revision and replay receipts exactly', async t => {
  const { prisma, services } = await rowFixture(t);
  const created = await createHolding(services, 'owner-a', 'h1');
  assert.equal(created.revision, 1);
  const body = { mutationId: 'edit-h1-0001', expectedRevision: 1, record: { units: 12 } };
  const updated = await services.holdings.update('owner-a', 'h1', body);
  assert.deepEqual([updated.revision, updated.units, updated.name], [2, 12, 'Index fund']);
  assert.deepEqual(await services.holdings.update('owner-a', 'h1', body), updated, 'a retried request returns the original result');
  await assert.rejects(services.holdings.update('owner-a', 'h1', { ...body, record: { units: 99 } }), { code: 'MUTATION_REUSED' });
  const stale = await services.holdings.update('owner-a', 'h1', { mutationId: 'edit-h1-0002', expectedRevision: 1, record: { units: 1 } }).catch(error => error);
  assert.equal(stale.code, 'VERSION_CONFLICT');
  assert.equal(stale.current.units, 12, 'the conflict carries the current record');
  await assert.rejects(services.holdings.update('owner-a', 'h1', { mutationId: 'edit-h1-0003', expectedRevision: 2, record: { units: -1 } }), { code: 'INVALID_PORTFOLIO' });
  assert.equal((await services.holdings.listAll('owner-a'))[0].units, 12);
  assert.equal(await prisma.recordMutation.count(), 2);
});

test('records are owner-scoped, deletions are tombstones and re-creation revives them', async t => {
  const { services } = await rowFixture(t);
  await createHolding(services, 'owner-a', 'shared-id');
  await createHolding(services, 'owner-b', 'shared-id', { name: 'B' });
  await assert.rejects(services.holdings.update('owner-b', 'missing', { mutationId: 'edit-missing-1', expectedRevision: 1, record: {} }), { code: 'RECORD_NOT_FOUND' });
  const removed = await services.holdings.remove('owner-a', 'shared-id', { mutationId: 'delete-shared-1', expectedRevision: 1 });
  assert.deepEqual(removed, { id: 'shared-id', revision: 2, deleted: true });
  assert.equal((await services.holdings.listAll('owner-a')).length, 0);
  assert.equal((await services.holdings.listAll('owner-b'))[0].name, 'B', 'another owner’s record with the same id is untouched');
  const revived = await createHolding(services, 'owner-a', 'shared-id', { name: 'Undo' });
  assert.deepEqual([revived.revision, revived.name], [3, 'Undo']);
  await assert.rejects(createHolding(services, 'owner-a', 'shared-id'), { code: 'DUPLICATE_RECORD' });
  const feed = await services.holdings.changes('owner-a');
  assert.deepEqual(feed.changes.map(change => change.operation), ['create', 'delete', 'restore']);
  assert.equal((await services.holdings.changes('owner-a', { cursor: feed.cursor })).changes.length, 0);
  assert.equal((await services.holdings.changes('owner-b')).changes.length, 1);
});

test('calendar rows validate events and protect mirrored events from owner edits', async t => {
  const { prisma, services } = await rowFixture(t);
  await assert.rejects(services.calendar.create('owner-a', { id: 'bad', mutationId: 'create-bad-1', record: { title: '', date: '2026-10-20' } }), { code: 'INVALID_EVENT' });
  const created = await services.calendar.create('owner-a', { id: 'mine', mutationId: 'create-mine-1', record: { ...event, syncProvider: 'ics', readOnly: true } });
  assert.equal(created.readOnly, undefined, 'clients cannot mark their own events as mirrored');
  await services.calendar.systemPut(prisma, 'owner-a', { id: 'feed-1', ...event, title: 'Synced' }, { syncProvider: 'ics' });
  await assert.rejects(services.calendar.update('owner-a', 'feed-1', { mutationId: 'edit-feed-1', expectedRevision: 1, record: { title: 'Mine now' } }), { code: 'READ_ONLY_RECORD' });
  await assert.rejects(services.calendar.remove('owner-a', 'feed-1', { mutationId: 'delete-feed-1', expectedRevision: 1 }), { code: 'READ_ONLY_RECORD' });
});

test('a stale client can no longer overwrite synced prices, and synced events never touch owner rows', async t => {
  const { prisma, services } = await rowFixture(t);
  await createHolding(services, 'owner-a', 'mf');
  const staleTab = (await services.holdings.listAll('owner-a'))[0];
  const engine = createSyncEngine({ prisma, records: services, sealer: createSealer('a'.repeat(64)), fetchJson: async () => navResponse,
    fetchText: async () => ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Test//EN', 'BEGIN:VEVENT', 'UID:one', 'DTSTAMP:20261015T080000Z', 'DTSTART;VALUE=DATE:20261101', 'SUMMARY:Team day', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n'),
    now: () => new Date('2026-10-18T00:00:00Z') });
  await engine.connect('owner-a', 'mfapi', { runNow: false });
  const run = await engine.run('owner-a', 'mfapi');
  assert.equal(run.status, 'success');
  assert.deepEqual([run.data.portfolio[0].currentPrice, run.data.portfolio[0].revision], [123.4567, 2]);

  // The tab that loaded revision 1 tries to save an edit on top of the old price.
  const conflict = await services.holdings.update('owner-a', 'mf', { mutationId: 'stale-tab-01', expectedRevision: staleTab.revision, record: { ...staleTab, units: 11 } }).catch(error => error);
  assert.equal(conflict.code, 'VERSION_CONFLICT');
  assert.equal(conflict.current.currentPrice, 123.4567);
  const stored = (await services.holdings.listAll('owner-a'))[0];
  assert.deepEqual([stored.currentPrice, stored.priceDate, stored.units], [123.4567, '2026-10-16', 10]);
  // After refreshing, the owner's edit applies on top of the synced price.
  const merged = await services.holdings.update('owner-a', 'mf', { mutationId: 'fresh-tab-01', expectedRevision: conflict.current.revision, record: { units: 11 } });
  assert.deepEqual([merged.units, merged.currentPrice, merged.quote.source], [11, 123.4567, 'mfapi.in']);
  // A repeat sync with an unchanged quote does not bump the revision.
  await engine.run('owner-a', 'mfapi');
  assert.equal((await services.holdings.listAll('owner-a'))[0].revision, merged.revision);

  const mine = await services.calendar.create('owner-a', { id: 'mine', mutationId: 'create-mine-2', record: event });
  await engine.connect('owner-a', 'ics', { config: { url: 'https://calendar.example.com/a.ics', label: 'Work' }, runNow: false });
  const calendarRun = await engine.run('owner-a', 'ics');
  assert.deepEqual(calendarRun.summary, { events: 1, added: 1, updated: 0, removed: 0, skipped: 0, outsideWindow: 0 });
  const synced = calendarRun.data.calendar_events.find(row => row.syncProvider === 'ics');
  assert.deepEqual([synced.title, synced.readOnly, synced.syncLabel], ['Team day', true, 'Work']);
  assert.equal((await services.calendar.listAll('owner-a')).find(row => row.id === 'mine').revision, mine.revision);
  const disconnected = await engine.disconnect('owner-a', 'ics', { removeData: true });
  assert.equal(disconnected.removed, 1);
  assert.deepEqual(disconnected.data.calendar_events.map(row => row.id), ['mine']);
});

test('configured record limits and record size are enforced', async t => {
  const { prisma } = await rowFixture(t);
  const services = createRecordServices(prisma, { limits: { calendar: 5000, holdings: 1 }, maxRecordBytes: 2048 });
  await createHolding(services, 'owner-a', 'only');
  await assert.rejects(createHolding(services, 'owner-a', 'second'), { code: 'RECORD_LIMIT' });
  await createHolding(services, 'owner-b', 'other-owner');
  await assert.rejects(services.calendar.create('owner-a', { id: 'big', mutationId: 'create-big-0001', record: { ...event, description: 'x'.repeat(4000) } }), { code: 'RECORD_TOO_LARGE' });
});

test('versioned routes stay closed until the migration is enabled', async t => {
  const { services } = await rowFixture(t);
  const routes = [];
  const app = { get: (route, _auth, handler) => routes.push([route, handler]), post: () => {}, put: () => {}, delete: () => {} };
  registerRecordRoutes(app, { authMiddleware: () => {}, services, enabled: false });
  const res = { statusCode: 200, headers: {}, setHeader() {}, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await routes.find(([route]) => route === '/api/v1/finance/holdings')[1]({ user: { id: 'owner-a' }, query: {} }, res);
  assert.deepEqual([res.statusCode, res.body.code], [503, 'RECORD_ROWS_MIGRATION_REQUIRED']);
  assert.equal(toClient({ id: 'x', revision: 1, data: 'not json', updatedAt: new Date(0) }).id, 'x');
});
