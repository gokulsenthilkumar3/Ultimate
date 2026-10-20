import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isolatedFixture } from './fixture.mjs';
import { legacyNotesModel } from '../../../server/domains/legacyNotes.js';
import { rehearseNoteMigration } from '../../../server/domains/noteMigration.js';

async function legacy(t) {
  const result = await isolatedFixture(t);
  await result.prisma.$executeRawUnsafe('CREATE TABLE "Note" (id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES "User"(id), title TEXT, content TEXT, data TEXT, createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, createdBy TEXT, updatedBy TEXT, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
  await legacyNotesModel(result.prisma).create({ data: { id: 'preserved', userId: 'owner-a', title: 'Keep', content: 'Exact body', data: '{"pinned":true}' } });
  return result;
}
test('default rehearsal verifies backup/restore/parity without migrating live storage', async t => {
  const { prisma, directory } = await legacy(t);
  const result = await rehearseNoteMigration({ source: path.join(directory, 'test.db'), directory: path.join(directory, 'backups') });
  assert.equal(result.applied, false);
  assert.equal(result.proof.noteCount, 1);
  assert.equal(result.proof.baselineRevisions, 1);
  assert.equal((await prisma.$queryRawUnsafe('PRAGMA table_info("Note")')).some(row => row.name === 'revision'), false);
  assert.equal((await fs.stat(result.reportPath)).isFile(), true);
});
test('explicit apply preserves legacy fields and appends baseline records; reruns reject without changing data', async t => {
  const { prisma, directory } = await legacy(t);
  const before = await legacyNotesModel(prisma).findMany({ orderBy: { id: 'asc' } });
  const options = { source: path.join(directory, 'test.db'), directory: path.join(directory, 'backups'), apply: true };
  const result = await rehearseNoteMigration(options);
  assert.equal(result.applied, true);
  assert.deepEqual(await legacyNotesModel(prisma).findMany({ orderBy: { id: 'asc' } }), before);
  assert.equal(await prisma.noteRevision.count(), 1);
  assert.equal(await prisma.noteChange.count(), 1);
  await assert.rejects(rehearseNoteMigration(options), /already been applied/);
  assert.deepEqual(await legacyNotesModel(prisma).findMany({ orderBy: { id: 'asc' } }), before);
});
