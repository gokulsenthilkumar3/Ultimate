import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createNotesService, registerNotesRoutes } from '../../../server/domains/notes.js';
import { legacyNotesModel } from '../../../server/domains/legacyNotes.js';
import BaseController from '../../../server/controllers/BaseController.js';
import { isolatedFixture, request, response, call } from './fixture.mjs';

const migration = await readFile(new URL('../../../prisma/migrations/20261005190000_note_revisions/migration.sql', import.meta.url), 'utf8');
const typedMigration = await readFile(new URL('../../../prisma/migrations/20261103120000_typed_note_fields/migration.sql', import.meta.url), 'utf8');
async function fixture(t, migrate = true, seed) {
  const result = await isolatedFixture(t);
  await result.prisma.$executeRawUnsafe(`CREATE TABLE "Note" (
    id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES "User"(id), title TEXT, content TEXT, data TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, createdBy TEXT, updatedBy TEXT,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
  if (seed) await seed(legacyNotesModel(result.prisma));
  if (migrate) await result.prisma.$transaction(async tx => {
    for (const statement of migration.split(';').map(sql => sql.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
    // This focused fixture has no mood records; its note/revision DDL is the
    // same additive migration that the complete-database tests replay.
    for (const statement of typedMigration.split(';').map(sql => sql.replace(/^\s*--.*$/gm, '').trim()).filter(sql => sql && !/^(BEGIN|COMMIT)/.test(sql) && !sql.includes('"MoodLog"') && !sql.includes('"Habit"'))) await tx.$executeRawUnsafe(statement);
  });
  return { ...result, service: createNotesService(result.prisma) };
}
const body = (id = 'note-a') => ({ id, mutationId: `create:${id}`, title: 'Research', content: 'First body', pinned: true, tags: ['work'], color: '#123456' });

test('legacy metadata cannot silently reclassify Workspace content as a private journal', async t => {
  const { service } = await fixture(t);
  await service.create('owner-a', body());
  await assert.rejects(service.legacyUpdate('owner-a', 'note-a', { source: 'mind-journal' }), { code: 'NOTE_DOMAIN_CHANGE' });
  assert.equal((await service.get('owner-a', 'note-a')).revision, 1);
});

test('create/update receipts replay exactly and reject reuse with another payload', async t => {
  const { prisma, service } = await fixture(t);
  const first = await service.create('owner-a', body());
  assert.equal(first.revision, 1);
  assert.deepEqual(await service.create('owner-a', body()), first);
  const update = { mutationId: 'edit-a', expectedRevision: 1, content: 'Second body' };
  const saved = await service.update('owner-a', first.id, update);
  assert.equal(saved.revision, 2);
  assert.deepEqual(await service.update('owner-a', first.id, update), saved);
  assert.deepEqual(await service.create('owner-a', body()), first);
  await assert.rejects(service.update('owner-a', first.id, { ...update, content: 'Other body' }), { code: 'MUTATION_REUSED' });
  assert.equal((await service.get('owner-a', first.id)).content, 'Second body');
  assert.equal(await prisma.note.count(), 1);
  assert.equal(await prisma.noteRevision.count(), 2);
  assert.equal(await prisma.noteChange.count(), 2);
  assert.equal(await prisma.noteMutation.count(), 2);
  assert.equal(JSON.parse((await prisma.note.findUnique({ where: { id: first.id } })).data || '{}').mutationId, undefined);
});

test('concurrent clients create once and one stale writer loses without deleting either version', async t => {
  const { prisma, url, service } = await fixture(t);
  const other = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
  t.after(() => other.$disconnect());
  const second = createNotesService(other);
  const created = await Promise.all([service.create('owner-a', body()), second.create('owner-a', body())]);
  assert.deepEqual(created[0], created[1]);
  const results = await Promise.allSettled([
    service.update('owner-a', 'note-a', { mutationId: 'device-a', expectedRevision: 1, content: 'Device A' }),
    second.update('owner-a', 'note-a', { mutationId: 'device-b', expectedRevision: 1, content: 'Device B' }),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  const failed = results.find(result => result.status === 'rejected').reason;
  assert.equal(failed.code, 'VERSION_CONFLICT');
  assert.equal(failed.current.revision, 2);
  assert.equal(await prisma.noteRevision.count(), 2);
  assert.equal(await prisma.noteMutation.count(), 2);
});

test('every read/write/history/restore path denies another owner and sync discloses no records', async t => {
  const { service } = await fixture(t);
  await service.create('owner-a', body());
  const operations = [
    () => service.get('owner-b', 'note-a'),
    () => service.update('owner-b', 'note-a', { mutationId: 'b-edit', expectedRevision: 1, content: 'Intrusion' }),
    () => service.remove('owner-b', 'note-a', { mutationId: 'b-delete', expectedRevision: 1 }),
    () => service.restore('owner-b', 'note-a', { mutationId: 'b-restore', expectedRevision: 1, revision: 1 }),
    () => service.revisions('owner-b', 'note-a'),
  ];
  for (const operation of operations) await assert.rejects(operation(), { code: 'NOTE_NOT_FOUND' });
  assert.deepEqual((await service.list('owner-b')).items, []);
  assert.deepEqual((await service.sync('owner-b')).changes, []);
  assert.equal((await service.get('owner-a', 'note-a')).content, 'First body');
});

test('delete is a replayable tombstone and restore appends a revision preserving history', async t => {
  const { prisma, service } = await fixture(t);
  await service.create('owner-a', body());
  await service.update('owner-a', 'note-a', { mutationId: 'edit', expectedRevision: 1, content: 'Changed' });
  const input = { mutationId: 'delete', expectedRevision: 2 };
  const tombstone = await service.remove('owner-a', 'note-a', input);
  assert.ok(tombstone.deletedAt);
  assert.deepEqual(await service.remove('owner-a', 'note-a', input), tombstone);
  assert.equal((await service.list('owner-a')).items.length, 0);
  await assert.rejects(service.get('owner-a', 'note-a'), { code: 'NOTE_NOT_FOUND' });
  const sync = await service.sync('owner-a', { cursor: 2 });
  assert.equal(sync.changes[0].operation, 'delete');
  assert.equal(sync.changes[0].note.revision, 3);
  assert.ok(sync.changes[0].note.deletedAt);
  const restored = await service.restore('owner-a', 'note-a', { mutationId: 'restore', expectedRevision: 3, revision: 1 });
  assert.equal(restored.content, 'First body');
  assert.equal(restored.pinned, true);
  assert.deepEqual(restored.tags, ['work']);
  assert.equal(restored.color, '#123456');
  assert.equal(restored.deletedAt, null);
  assert.equal(restored.revision, 4);
  const history = await service.revisions('owner-a', 'note-a', { limit: 2 });
  assert.deepEqual(history.items.map(row => row.content), ['First body', 'Changed']);
  assert.equal(history.nextCursor, 2);
  assert.deepEqual((await service.revisions('owner-a', 'note-a', { cursor: 2 })).items.map(row => row.revision), [3, 4]);
  assert.equal(await prisma.note.count(), 1);
});

test('notes and revision snapshots keep ordinary fields in columns and preserve them through legacy edits and restore', async t => {
  const { prisma, service } = await fixture(t);
  const created = await service.create('owner-a', body());
  const row = await prisma.note.findUnique({ where: { id: created.id } });
  assert.equal(row.data, null);
  assert.equal(row.color, '#123456');
  assert.equal(row.tags, '["work"]');
  await service.legacyUpdate('owner-a', created.id, { title: 'Renamed' });
  const reloaded = await service.get('owner-a', created.id);
  assert.equal(reloaded.pinned, true);
  assert.deepEqual(reloaded.tags, ['work']);
  const revision = await prisma.noteRevision.findUnique({ where: { noteId_revision: { noteId: created.id, revision: 2 } } });
  assert.equal(revision.pinned, true);
  assert.equal(revision.tags, '["work"]');
  const journal = await service.legacyCreate('owner-a', { id: 'journal-typed', source: 'mind-journal', date: '2026-11-03', time: '09:30', text: 'Synthetic journal', content: 'Synthetic journal', prompt: 'What did you learn?', journalVersion: 1, wordCount: 2 });
  const storedJournal = await prisma.note.findUnique({ where: { id: journal.id } });
  assert.equal(storedJournal.source, 'mind-journal');
  assert.equal(storedJournal.wordCount, 2);
  assert.equal(storedJournal.data, null);
  await assert.rejects(service.get('owner-a', journal.id), { code: 'NOTE_NOT_FOUND' });
});

test('typed legacy note endpoints classify journals privately before v1 is enabled', async t => {
  const { prisma, service } = await fixture(t);
  const controller = new BaseController(legacyNotesModel(prisma, { typedFields: true }), 'notes');
  const created = await call(controller.create.bind(controller), request({ id: 'private-legacy', source: 'mind-journal', content: 'Synthetic journal', wordCount: 2 }));
  assert.equal(created.statusCode, 200);
  assert.equal(created.body.kind, 'mind-journal');
  assert.equal(created.body.data, null);
  await assert.rejects(service.get('owner-a', created.body.id), { code: 'NOTE_NOT_FOUND' });
  assert.equal((await service.list('owner-a')).items.length, 0);
  const changed = await call(controller.update.bind(controller), request({ source: null }, 'owner-a', created.body.id));
  assert.equal(changed.statusCode, 400);
  assert.equal(changed.body.code, 'NOTE_DOMAIN_CHANGE');
  assert.equal((await prisma.note.findUnique({ where: { id: created.body.id } })).source, 'mind-journal');
});

test('list and sync have bounded owner-scoped cursors and search/pin filtering', async t => {
  const { service } = await fixture(t);
  for (const id of ['a', 'b', 'c']) await service.create('owner-a', { ...body(id), pinned: id !== 'b', title: id === 'c' ? 'Special' : 'Research' });
  await service.create('owner-b', body('z'));
  const page = await service.list('owner-a', { limit: 2 });
  assert.deepEqual(page.items.map(row => row.id), ['a', 'b']);
  assert.equal(page.nextCursor, 'b');
  assert.deepEqual((await service.list('owner-a', { after: page.nextCursor })).items.map(row => row.id), ['c']);
  assert.deepEqual((await service.list('owner-a', { view: 'pinned' })).items.map(row => row.id), ['a', 'c']);
  assert.deepEqual((await service.list('owner-a', { search: 'Special' })).items.map(row => row.id), ['c']);
  const sync = await service.sync('owner-a', { limit: 2 });
  assert.equal(sync.hasMore, true);
  const tail = await service.sync('owner-a', { cursor: sync.cursor });
  assert.deepEqual(tail.changes.map(row => row.noteId), ['c']);
  assert.equal(tail.hasMore, false);
  await assert.rejects(service.list('owner-a', { limit: 10000 }), { code: 'INVALID_NOTE' });
  await assert.rejects(service.sync('owner-a', { cursor: -1 }), { code: 'INVALID_NOTE' });
});

test('legacy journal data never enters Workspace APIs, history or sync', async t => {
  const { service } = await fixture(t);
  const journal = await service.legacyCreate('owner-a', { id: 'journal', title: 'Private', content: 'Secret', data: { source: 'mind-journal' } });
  assert.equal(journal.kind, 'mind-journal');
  assert.equal((await service.list('owner-a')).items.length, 0);
  assert.equal((await service.sync('owner-a')).changes.length, 0);
  await assert.rejects(service.get('owner-a', 'journal'), { code: 'NOTE_NOT_FOUND' });
  await assert.rejects(service.revisions('owner-a', 'journal'), { code: 'NOTE_NOT_FOUND' });
  const changed = await service.legacyUpdate('owner-a', 'journal', { content: 'New secret', expectedUpdatedAt: journal.updatedAt });
  assert.equal(changed.kind, 'mind-journal');
  assert.equal(changed.revision, 2);
  assert.equal((await service.sync('owner-a')).changes.length, 0);
});

test('legacy and v1 updates share atomic history and reject stale timestamp writes', async t => {
  const { prisma, service } = await fixture(t);
  const created = await service.legacyCreate('owner-a', { id: 'legacy', title: 'Original', content: 'Legacy text' });
  await service.update('owner-a', 'legacy', { mutationId: 'v1-edit', expectedRevision: 1, content: 'New text' });
  await assert.rejects(service.legacyUpdate('owner-a', 'legacy', { content: 'Stale', expectedUpdatedAt: created.updatedAt }), { code: 'VERSION_CONFLICT' });
  assert.equal((await service.get('owner-a', 'legacy')).content, 'New text');
  assert.equal(await prisma.noteRevision.count(), 2);
});

test('migration preserves content, IDs and timestamps, including malformed metadata and journals', async t => {
  const rows = [
    { id: 'old-a', userId: 'owner-a', title: 'Exact', content: 'Unicode: \u2603\n\r\n', data: '{"pinned": true, "starred":true}' },
    { id: 'old-b', userId: 'owner-a', title: null, content: null, data: '{broken' },
    { id: 'old-j', userId: 'owner-a', title: 'Journal', content: 'Private', data: '{ "source" : "mind-journal" }' },
  ];
  let before;
  const { prisma, service } = await fixture(t, true, async model => {
    for (const row of rows) await model.create({ data: row });
    before = await model.findMany({ orderBy: { id: 'asc' } });
  });
  const after = await legacyNotesModel(prisma).findMany({ orderBy: { id: 'asc' } });
  assert.deepEqual(after.map(({data,...row})=>row), before.map(({data,...row})=>row));
  assert.equal(after.find(row=>row.id==='old-b').data, '{broken');
  assert.equal(after.find(row=>row.id==='old-a').data, null);
  assert.equal((await service.get('owner-a','old-a')).pinned, true);
  assert.equal(await prisma.noteRevision.count(), 3);
  assert.equal(await prisma.noteChange.count(), 2);
  assert.deepEqual((await service.list('owner-a', { view: 'pinned' })).items.map(row => row.id), ['old-a']);
  assert.equal((await prisma.note.findUnique({ where: { id: 'old-j' } })).kind, 'mind-journal');
});

test('regenerated client works with unmigrated Note storage through the compatibility model', async t => {
  const { prisma } = await fixture(t, false);
  const model = legacyNotesModel(prisma);
  const row = await model.create({ data: { id: 'old', userId: 'owner-a', content: 'Kept' } });
  assert.equal(row.content, 'Kept');
  assert.equal(row.revision, undefined);
  assert.equal((await model.updateMany({ where: { id: row.id }, data: { content: 'Still works' } })).count, 1);
  assert.equal((await model.findFirst({ where: { id: row.id } })).content, 'Still works');
  assert.equal(await model.count(), 1);
});

test('revision/change failure rolls back note and receipt in the same transaction', async t => {
  const { prisma } = await fixture(t);
  const failing = { $transaction: (work, options) => prisma.$transaction(tx => work(new Proxy(tx, { get(target, key) {
    if (key === 'noteChange') return { create: async () => { throw new Error('Injected change-log failure'); } };
    return Reflect.get(target, key);
  }})), options) };
  await assert.rejects(createNotesService(failing).create('owner-a', body()), /Injected change-log failure/);
  assert.equal(await prisma.note.count(), 0);
  assert.equal(await prisma.noteRevision.count(), 0);
  assert.equal(await prisma.noteMutation.count(), 0);
});

test('disabled v1 is explicitly unavailable and registers authentication on every route', async () => {
  const routes = [];
  const auth = () => {};
  const app = Object.fromEntries(['get', 'post', 'put', 'delete', 'patch'].map(method => [method, (path, ...handlers) => routes.push({ method, path, handlers })]));
  registerNotesRoutes(app, { prisma: {}, authMiddleware: auth });
  assert.equal(routes.length, 8);
  for (const route of routes) assert.equal(route.handlers[0], auth);
  const res = response();
  await routes[0].handlers.at(-1)(request(), res);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, 'NOTES_MIGRATION_REQUIRED');
});
