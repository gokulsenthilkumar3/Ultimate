import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@libsql/client';
import { createSQLiteBackup } from './sqliteBackup.js';

const SQL = await fs.readFile(new URL('../../prisma/migrations/20261005190000_note_revisions/migration.sql', import.meta.url), 'utf8');
const statements = SQL.split(';').map(value => value.trim()).filter(Boolean);
const projection = 'SELECT "id", "userId", "title", "content", "data", "createdAt", "createdBy", "updatedBy", "updatedAt" FROM "Note" ORDER BY "id"';
const digest = rows => createHash('sha256').update(JSON.stringify(rows)).digest('hex');

async function migrateFile(filename, expectedHash) {
  const client = createClient({ url: `file:${filename.replaceAll('\\', '/')}` });
  let tx;
  try {
    tx = await client.transaction('write');
    const before = await tx.execute(projection);
    const hash = digest(before.rows);
    if (expectedHash && hash !== expectedHash) throw new Error('Notes changed after the backup. Stop writes and rehearse again before applying.');
    const columns = await tx.execute('PRAGMA table_info("Note")');
    if (columns.rows.some(row => row.name === 'revision')) throw new Error('This Notes migration has already been applied or the schema is partially upgraded.');
    for (const statement of statements) await tx.execute(statement);
    const after = await tx.execute(projection);
    if (digest(after.rows) !== hash) throw new Error('Legacy Notes parity failed; the migration will be rolled back.');
    const revisions = Number((await tx.execute('SELECT count(*) AS count FROM "NoteRevision"')).rows[0].count);
    if (revisions !== before.rows.length) throw new Error('The migration did not preserve every Notes baseline.');
    if ((await tx.execute('PRAGMA foreign_key_check')).rows.length) throw new Error('Migration foreign-key verification failed.');
    await tx.commit();
    return { noteCount: before.rows.length, baselineRevisions: revisions, legacyHash: hash, migrationHash: digest(SQL) };
  } catch (error) {
    if (tx) await tx.rollback().catch(() => undefined);
    throw error;
  } finally { tx?.close(); client.close(); }
}

export async function rehearseNoteMigration({ source, directory, apply = false }) {
  const backup = await createSQLiteBackup({ source, directory });
  const rehearsal = backup.backup.replace(/\.db$/, '-notes-rehearsal.db');
  await fs.copyFile(backup.backup, rehearsal, fs.constants.COPYFILE_EXCL);
  await fs.chmod(rehearsal, 0o600);
  const proof = await migrateFile(rehearsal);
  let applied = false;
  if (apply) { await migrateFile(path.resolve(source), proof.legacyHash); applied = true; }
  const reportPath = rehearsal.replace(/\.db$/, '.json');
  await fs.writeFile(reportPath, JSON.stringify({ version: 1, applied, backupManifest: path.basename(backup.manifestPath), rehearsal: path.basename(rehearsal), ...proof }, null, 2), { flag: 'wx', mode: 0o600 });
  return { reportPath, applied, proof };
}
