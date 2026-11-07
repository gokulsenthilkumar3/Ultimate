// Explicit operator migration; source stays intact. No private record output.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { createDatabaseClient } from '../server/database.js';
import { createClient } from '@libsql/client';
import { createEncryptedSQLiteBackup } from '../server/domains/scheduledBackups.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const dotenv = require('dotenv');
const { Prisma } = require('@prisma/client');
const sourceEnv = dotenv.parse(fs.readFileSync(path.join(root, '.env')));
const targetEnv = dotenv.parse(fs.readFileSync(path.join(root, '.env.sqlserver')));
const temporaryIdentityPermission = process.argv.includes('--local-identity-permission');
const identityPermission = action => {
  if (!temporaryIdentityPermission) return;
  if (!targetEnv.DATABASE_URL.startsWith('sqlserver://127.0.0.1:14333;database=GrowthTrackDB;user=growthtrack_app;')) throw new Error('Local identity permission is restricted to this workspace SQL Express target.');
  const query = `${action} ALTER ON OBJECT::dbo.record_changes ${action === 'GRANT' ? 'TO' : 'FROM'} growthtrack_app; ${action} ALTER ON OBJECT::dbo.NoteChange ${action === 'GRANT' ? 'TO' : 'FROM'} growthtrack_app;`;
  const result = spawnSync('C:/Program Files/Microsoft SQL Server/Client SDK/ODBC/180/Tools/Binn/SQLCMD.EXE', ['-S', '.\\SQLEXPRESS', '-d', 'GrowthTrackDB', '-E', '-C', '-b', '-Q', query], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error('Local operator identity permission operation failed.');
};
if (sourceEnv.DATABASE_PROVIDER === 'sqlserver' || sourceEnv.DATABASE_URL?.startsWith('sqlserver:')) throw new Error('Live environment is already SQL Server. Refusing repeated migration.');
const { prisma: source } = await createDatabaseClient(root, sourceEnv);
const sourceUrl = sourceEnv.DATABASE_URL?.startsWith('file:./') ? `file:${path.resolve(root, sourceEnv.DATABASE_URL.slice(5)).replaceAll('\\', '/')}` : sourceEnv.DATABASE_URL || `file:${root.replaceAll('\\', '/')}/dev.db`;
const rawSource = createClient({ url: sourceUrl });
const { prisma: target } = await createDatabaseClient(root, targetEnv);
const models = Prisma.dmmf.datamodel.models;
// Public DMMF is intentionally compact in this Prisma release. Recover mapping,
// identity and dependency annotations from the checked-in model contract.
const contract = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');
for (const model of models) {
  const body = contract.match(new RegExp(`model ${model.name} \\{([\\s\\S]*?)^\\}`, 'm'))?.[1];
  if (!body) throw new Error('Model contract could not be located.');
  model.dbName = body.match(/@@map\("([^"\n]+)"\)/)?.[1] || model.name;
  for (const field of model.fields) {
    const line = body.split('\n').find(line => new RegExp(`^\\s*${field.name}\\s`).test(line)) || '';
    field.dbName = line.match(/@map\("([^"\n]+)"\)/)?.[1] || field.name;
    if (line.includes('@default(autoincrement())')) field.default = { name: 'autoincrement' };
    if (line.includes('@relation(') && line.includes('fields:')) field.relationFromFields = ['scoped'];
  }
}
const delegates = model => model.name[0].toLowerCase() + model.name.slice(1);
const stable = value => value instanceof Date ? value.toISOString() : typeof value === 'bigint' ? String(value) : Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])])) : value;
const digest = rows => crypto.createHash('sha256').update(JSON.stringify(rows.map(row => JSON.stringify(stable(row))).sort())).digest('hex');
const ordered = [], pending = new Set(models.map(model => model.name));
const projections = new Map();
const sourceTables = new Set((await rawSource.execute("SELECT name FROM sqlite_master WHERE type='table'")).rows.map(row => row.name));
const quote = value => '"' + value.replaceAll('"', '""') + '"';
async function readSource(model) {
  const table = model.dbName || model.name;
  if (!sourceTables.has(table)) { projections.set(model.name, []); return []; }
  const fields = model.fields.filter(field => field.kind !== 'object');
  const columns = (await rawSource.execute(`PRAGMA table_info(${quote(table)})`)).rows.map(row => row.name);
  const known = new Set(fields.map(field => field.dbName || field.name));
  const unknown = columns.filter(column => !known.has(column) && !['amountMinor','limitMinor','costMinor'].includes(column));
  for (const column of unknown) if ((await rawSource.execute(`SELECT count(*) AS count FROM ${quote(table)} WHERE ${quote(column)} IS NOT NULL`)).rows[0].count) throw new Error(`Unmapped populated column ${table}.${column}; source preserved for reviewed mapping.`);
  const selected = fields.filter(field => columns.includes(field.dbName || field.name));
  projections.set(model.name, selected.map(field => field.name));
  const rows = (await rawSource.execute(`SELECT * FROM ${quote(table)} LIMIT 100001`)).rows;
  return rows.map(row => Object.fromEntries(selected.map(field => {
    let value = row[field.dbName || field.name];
    if (value != null) {
      if (field.type === 'DateTime') { value = new Date(value); if (!Number.isFinite(value.getTime())) throw new Error(`Invalid date in ${table}.${field.name}; source preserved.`); }
      if (field.type === 'Boolean') value = Boolean(value);
    }
    return [field.name, value];
  })));
}
const projected = (model, rows) => rows.map(row => Object.fromEntries(projections.get(model.name).map(key => [key, row[key]])));
while (pending.size) {
  const ready = models.filter(model => pending.has(model.name) && model.fields.filter(f => f.kind === 'object' && f.relationFromFields?.length && f.type !== model.name).every(f => !pending.has(f.type)));
  if (!ready.length) throw new Error('Cyclic dependency requires a separately reviewed migration.');
  for (const model of ready) { ordered.push(model); pending.delete(model.name); }
}
try {
  const records = new Map();
  for (const model of ordered) {
    const key = delegates(model);
    if (await target[key].count()) throw new Error('Target contains application records. No data was replaced.');
    const rows = await readSource(model);
    if (rows.length > 100000) throw new Error('Table exceeds bounded migration size; use a paged migration.');
    records.set(model.name, rows);
  }
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ status: 'dry-run', models: ordered.length, records: [...records.values()].reduce((sum, rows) => sum + rows.length, 0), targetEmpty: true }));
  } else {
    if (!sourceEnv.APP_ENCRYPTION_KEY) throw new Error('Configure an encrypted backup key before applying this migration.');
    await createEncryptedSQLiteBackup({ source: sourceUrl.slice(5), directory: path.join(root, 'backups/sqlserver-cutover'), keyHex: sourceEnv.APP_ENCRYPTION_KEY });
    identityPermission('GRANT');
    await target.$transaction(async tx => {
      for (const model of ordered) {
        const rows = records.get(model.name), key = delegates(model);
        const identity = model.fields.some(field => field.default?.name === 'autoincrement');
        const table = model.dbName || model.name;
        if (!/^\w+$/.test(table)) throw new Error('Unexpected table identifier.');
        const width = Math.max(1, Math.floor(1800 / Math.max(1, model.fields.filter(f => f.kind !== 'object').length)));
        for (let offset = 0; offset < rows.length; offset += width) {
          const batch = rows.slice(offset, offset + width);
          if (!identity) await tx[key].createMany({ data: batch });
          else {
            // SQL Server's createMany input intentionally omits IDENTITY fields.
            // Preserve synchronization cursors with a parameterized operator INSERT.
            const columns = Object.keys(batch[0]), parameters = [];
            const values = batch.map(row => '(' + columns.map(column => { parameters.push(row[column]); return `@P${parameters.length}`; }).join(',') + ')').join(',');
            await tx.$executeRawUnsafe(`BEGIN TRY SET IDENTITY_INSERT [dbo].[${table}] ON; INSERT INTO [dbo].[${table}] (${columns.map(column => `[${column}]`).join(',')}) VALUES ${values}; SET IDENTITY_INSERT [dbo].[${table}] OFF; END TRY BEGIN CATCH SET IDENTITY_INSERT [dbo].[${table}] OFF; THROW; END CATCH`, ...parameters);
          }
        }
        if (digest(projected(model, await tx[key].findMany())) !== digest(rows)) throw new Error(`Parity mismatch in ${model.name}; transaction will roll back.`);
      }
    }, { timeout: 300000, maxWait: 15000 });
    // Source must stay quiescent until this check and the process cutover.
    for (const model of ordered) if (digest(await readSource(model)) !== digest(records.get(model.name))) throw new Error('Source changed during migration; do not activate the candidate environment.');
    console.log(JSON.stringify({ status: 'copied-and-parity-verified', models: ordered.length, records: [...records.values()].reduce((sum, rows) => sum + rows.length, 0), sourcePreserved: true }));
  }
} catch (error) {
  fs.mkdirSync(path.join(root, '../.code-index'), { recursive: true });
  let diagnostic = String(error.message);
  for (const env of [sourceEnv, targetEnv]) for (const [key, value] of Object.entries(env)) if (/KEY|SECRET|TOKEN|PASSWORD|DATABASE_URL/.test(key) && value.length > 4) diagnostic = diagnostic.replaceAll(value, '[redacted]');
  fs.writeFileSync(path.join(root, '../.code-index/sqlserver-migration-error.txt'), diagnostic);
  console.error(JSON.stringify({ status: 'failed', code: error.code || 'MIGRATION_FAILED', message: 'Migration failed; original storage and live environment were preserved. A private diagnostic was saved.' })); process.exitCode = 1;
}
finally { try { identityPermission('REVOKE'); } finally { rawSource.close(); await source.$disconnect(); await target.$disconnect(); } }
