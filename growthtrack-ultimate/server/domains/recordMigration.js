import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { createClient } from '@libsql/client';
import { createSQLiteBackup } from './sqliteBackup.js';
import { RECORD_FIELDS, RECORD_TABLES, recordColumnStatements, recordStorageData, recordPayload } from './recordFields.js';

const SQL = await fs.readFile(new URL('../../prisma/migrations/20261018120000_record_rows/migration.sql', import.meta.url), 'utf8');
const statements = SQL.split(';').map(value => value.replace(/^\s*--.*$/gm, '').trim()).filter(Boolean);
const projection = 'SELECT "id", "calendarEvents", "portfolio" FROM "User" ORDER BY "id"';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const typedStatements = Object.keys(RECORD_FIELDS).flatMap(recordColumnStatements);
// Fields that become row columns; everything else is copied verbatim.
const COLUMN_FIELDS = ['id', 'revision', 'readOnly', 'syncProvider'];

function parseDocument(text, owner, label) {
  if (text == null || text === '') return [];
  let value;
  try { value = JSON.parse(text); } catch { throw new Error(`Owner ${owner}: stored ${label} is not valid JSON. Repair it before migrating.`); }
  if (!Array.isArray(value)) throw new Error(`Owner ${owner}: stored ${label} is not a list.`);
  const ids = new Set();
  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`Owner ${owner}: ${label} item ${index + 1} is not a record.`);
    const id = item.id == null ? '' : String(item.id).trim();
    if (!id || id.length > 120 || /[\s/\\?#]/.test(id)) throw new Error(`Owner ${owner}: ${label} item ${index + 1} has no usable identifier. Open and save it once before migrating.`);
    if (ids.has(id)) throw new Error(`Owner ${owner}: ${label} repeats the identifier ${id}.`);
    ids.add(id);
  }
  return value;
}
const payload = item => JSON.stringify(Object.fromEntries(Object.entries(item).filter(([key]) => !COLUMN_FIELDS.includes(key))));
// What a client receives for a migrated row, minus server metadata.
const expected = item => ({ ...JSON.parse(payload(item)), id: String(item.id) });

async function migrateFile(filename, expectedHash, now = new Date().toISOString()) {
  const client = createClient({ url: `file:${filename.replaceAll('\\', '/')}` });
  let tx;
  try {
    tx = await client.transaction('write');
    const before = (await tx.execute(projection)).rows.map(row => ({ id: row.id, calendarEvents: row.calendarEvents, portfolio: row.portfolio }));
    const hash = digest(before);
    if (expectedHash && hash !== expectedHash) throw new Error('Calendar or portfolio data changed after the backup. Stop writes and rehearse again before applying.');
    const existing = await tx.execute("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('calendar_events','portfolio_holdings','record_mutations','record_changes')");
    if (existing.rows.length) throw new Error('The record-row migration has already been applied or the schema is partially upgraded.');
    for (const statement of statements) await tx.execute(statement);
    for (const statement of typedStatements) await tx.execute(statement);
    const insertRecord = async (collection, owner, item, extra = {}) => {
      const values = { userId: owner, id: String(item.id), revision: 1,
        ...recordStorageData(collection, JSON.parse(payload(item))), ...extra,
        createdAt: now, updatedAt: now, createdBy: 'migration', updatedBy: 'migration' };
      const keys = Object.keys(values);
      await tx.execute({ sql: `INSERT INTO "${RECORD_TABLES[collection]}" (${keys.map(key => `"${key}"`).join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
        args: keys.map(key => typeof values[key] === 'boolean' ? Number(values[key]) : values[key]) });
    };
    let events = 0; let holdings = 0;
    for (const owner of before) {
      for (const item of parseDocument(owner.calendarEvents, owner.id, 'calendar')) {
        const syncProvider = typeof item.syncProvider === 'string' && item.syncProvider ? item.syncProvider : null;
        await insertRecord('calendar', owner.id, item, { syncProvider });
        await tx.execute({ sql: 'INSERT INTO "record_changes" ("userId","collection","recordId","revision","operation","createdAt") VALUES (?,?,?,1,?,?)', args: [owner.id, 'calendar', String(item.id), 'create', now] });
        events += 1;
      }
      for (const [position, item] of parseDocument(owner.portfolio, owner.id, 'portfolio').entries()) {
        await insertRecord('holdings', owner.id, item, { position });
        await tx.execute({ sql: 'INSERT INTO "record_changes" ("userId","collection","recordId","revision","operation","createdAt") VALUES (?,?,?,1,?,?)', args: [owner.id, 'holdings', String(item.id), 'create', now] });
        holdings += 1;
      }
    }
    // Parity: every legacy record reads back identically, in order, per owner.
    for (const owner of before) {
      const eventRows = await tx.execute({ sql: 'SELECT * FROM "calendar_events" WHERE "userId" = ? ORDER BY "id"', args: [owner.id] });
      const holdingRows = await tx.execute({ sql: 'SELECT * FROM "portfolio_holdings" WHERE "userId" = ? ORDER BY "position"', args: [owner.id] });
      const legacyEvents = parseDocument(owner.calendarEvents, owner.id, 'calendar').map(expected).sort((a, b) => (a.id < b.id ? -1 : 1));
      const legacyHoldings = parseDocument(owner.portfolio, owner.id, 'portfolio').map(expected);
      if (digest(stable(eventRows.rows.map(row => ({ ...recordPayload(row, 'calendar'), id: row.id })))) !== digest(stable(legacyEvents))) throw new Error(`Owner ${owner.id}: calendar parity failed; the migration will be rolled back.`);
      if (digest(stable(holdingRows.rows.map(row => ({ ...recordPayload(row, 'holdings'), id: row.id })))) !== digest(stable(legacyHoldings))) throw new Error(`Owner ${owner.id}: portfolio parity failed; the migration will be rolled back.`);
    }
    const after = (await tx.execute(projection)).rows.map(row => ({ id: row.id, calendarEvents: row.calendarEvents, portfolio: row.portfolio }));
    if (digest(after) !== hash) throw new Error('Legacy calendar/portfolio documents changed during migration; rolled back.');
    if ((await tx.execute('PRAGMA foreign_key_check')).rows.length) throw new Error('Migration foreign-key verification failed.');
    await tx.commit();
    return { owners: before.length, events, holdings, legacyHash: hash, migrationHash: digest([SQL, ...typedStatements]) };
  } catch (error) {
    if (tx) await tx.rollback().catch(() => undefined);
    throw error;
  } finally { tx?.close(); client.close(); }
}

export { migrateFile as migrateRecordRowsFile };

/** Back up, prove the migration on a copy, and only then (with apply) run
    it on the source, refusing if its data changed since the rehearsal. */
export async function rehearseRecordMigration({ source, directory, apply = false }) {
  const backup = await createSQLiteBackup({ source, directory });
  const rehearsal = backup.backup.replace(/\.db$/, `-records-rehearsal-${randomUUID().slice(0, 8)}.db`);
  await fs.copyFile(backup.backup, rehearsal, fs.constants.COPYFILE_EXCL);
  await fs.chmod(rehearsal, 0o600);
  const proof = await migrateFile(rehearsal);
  let applied = false;
  if (apply) { await migrateFile(path.resolve(source), proof.legacyHash); applied = true; }
  const reportPath = rehearsal.replace(/\.db$/, '.json');
  await fs.writeFile(reportPath, JSON.stringify({ version: 1, applied, backupManifest: path.basename(backup.manifestPath), rehearsal: path.basename(rehearsal), ...proof }, null, 2), { flag: 'wx', mode: 0o600 });
  return { reportPath, applied, proof };
}
