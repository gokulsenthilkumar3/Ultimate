// Repair one explicit database. Rehearsal is the default; no application .env is read.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
class RepairError extends Error {}
const fail = message => { throw new RepairError(message); };

export function parseArguments(args, environment = process.env) {
  const options = { apply: false };
  for (const argument of args) {
    if (argument === '--apply-local' && !options.apply) options.apply = true;
    else if (argument.startsWith('--product=') && !options.product) options.product = argument.slice(10);
    else if (argument.startsWith('--database-file=') && !options.databaseFile) options.databaseFile = argument.slice(16);
    else fail('Use --product=ultimate|family|oxfin, optional --database-file=<SQLite file>, and optional --apply-local.');
  }
  if (!['ultimate', 'family', 'oxfin'].includes(options.product)) fail('Select exactly one --product=ultimate|family|oxfin.');
  const configured = environment.SCHEMA_REPAIR_DATABASE_URL;
  if (options.product === 'ultimate') {
    if (options.databaseFile && configured) fail('Specify either --database-file or SCHEMA_REPAIR_DATABASE_URL, not both.');
    const source = options.databaseFile || (configured?.startsWith('file:') ? configured.slice(5) : '');
    if (!source || source.startsWith('//') || source.startsWith('\\\\') || source.includes('?') || source.includes('#')) fail('Ultimate requires an explicit local --database-file or file: SCHEMA_REPAIR_DATABASE_URL without URL options.');
    options.databaseFile = path.resolve(source);
  } else {
    if (options.databaseFile || !configured) fail('PostgreSQL requires explicit SCHEMA_REPAIR_DATABASE_URL and no --database-file.');
    let url;
    try { url = new URL(configured); } catch { fail('SCHEMA_REPAIR_DATABASE_URL must be a PostgreSQL URL.'); }
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) fail('A PostgreSQL URL is required.');
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) fail('Schema repair accepts only a local PostgreSQL hostname.');
    if ([...url.searchParams.keys()].some(key => /^(host|hostaddr|service|options)$/i.test(key))) fail('PostgreSQL host and server-option overrides are unsupported.');
    options.databaseUrl = url.href;
  }
  return options;
}

// Preserve trigger/function BEGIN statements; remove only standalone wrappers.
export const sqlBody = sql => sql.replace(/^\s*(?:BEGIN(?:\s+(?:IMMEDIATE|DEFERRED|EXCLUSIVE))?|COMMIT);[ \t]*\r?$/gmi, '');
export function migrationFiles(product) {
  const directory = product === 'ultimate' ? 'growthtrack-ultimate/prisma/migrations' : 'Family Connect/familyconnect/backend/prisma/migrations';
  return fs.readdirSync(path.join(root, directory)).sort().flatMap(name => {
    const file = `${directory}/${name}/migration.sql`;
    if (!fs.existsSync(path.join(root, file))) return [];
    const sql = read(file);
    return [{ name, sql, checksum: createHash('sha256').update(sql).digest('hex') }];
  });
}
function checkHistory(rows, files, target, required, installed) {
  const successful = new Map();
  for (const row of rows) {
    if (row.rolled_back_at) continue;
    if (!row.finished_at) fail('Unfinished Prisma migration found. Reconcile migration history before repairing this database.');
    if (successful.has(row.migration_name)) fail('Duplicate successful Prisma history requires reconciliation.');
    successful.set(row.migration_name, row);
  }
  const inventory = new Map(files.map(file => [file.name, file]));
  for (const [name, row] of successful) {
    if (!inventory.has(name) || inventory.get(name).checksum !== row.checksum) fail('Prisma migration checksums differ from these sources. Reconcile history using the original migration files before continuing.');
  }
  const targetRecorded = successful.has(target.name);
  if (installed && !targetRecorded) fail('Repair schema is installed without its Prisma migration record. Reconcile existing history explicitly; this tool will not invent prior history.');
  if (!installed && targetRecorded) fail('Prisma records the repair, but its schema is missing. Reconcile schema drift before continuing.');
  const complete = files.filter(file => file.name < target.name).every(file => successful.has(file.name));
  if (required && !complete) fail('Prior Prisma migrations are missing from history. Reconcile every prior migration and checksum before --apply-local. Rehearsal remains available.');
  return { complete, targetRecorded };
}
const sqliteSql = sql => sql.trim().replace(/;$/, '').replace(/\s+/g, ' ').toLowerCase();
const moneyFields = [['Transaction', 'amount', 'amountMinor'], ['Budget', 'limit_amount', 'limitMinor'], ['SubscriptionItem', 'cost', 'costMinor']];
export function ultimateState(db) {
  const triggers = read('growthtrack-ultimate/prisma/integrity.sql').match(/CREATE TRIGGER[\s\S]*?END;/g) || [];
  let present = 0;
  let correct = 0;
  for (const [table, , field] of moneyFields) {
    const column = db.prepare(`PRAGMA table_info("${table}")`).all().find(column => column.name === field);
    if (column) { present++; if (column.type.toUpperCase() === 'INTEGER') correct++; }
  }
  for (const sql of triggers) {
    const name = sql.match(/CREATE TRIGGER\s+"?([^"\s]+)"?/i)[1];
    const existing = db.prepare("SELECT sql FROM sqlite_master WHERE type='trigger' AND name=?").get(name);
    if (existing) { present++; if (sqliteSql(existing.sql) === sqliteSql(sql)) correct++; }
  }
  if (!present) return false;
  if (correct !== moneyFields.length + triggers.length) fail('Ultimate repair is partially installed or differs from reviewed SQL. Restore/reconcile it before retrying.');
  for (const [table, field, minor] of moneyFields) {
    if (db.prepare(`SELECT 1 FROM "${table}" WHERE "${minor}" IS NOT CAST(round("${field}"*100) AS INTEGER) OR ("${field}" IS NOT NULL AND (abs("${field}")>1000000000000 OR "${field}"!=round("${field}",2))) LIMIT 1`).get()) fail('Ultimate money mirrors or existing precision need explicit reconciliation.');
  }
  if (db.prepare('SELECT 1 FROM GoalProgressLog p LEFT JOIN Goal g ON g.id=p.goalId WHERE g.id IS NULL OR g.userId<>p.userId LIMIT 1').get()) fail('Existing goal ownership needs explicit reconciliation.');
  return true;
}
export function repairSQLite(db, { apply = false } = {}) {
  const files = migrationFiles('ultimate');
  const target = files.find(file => file.name === '20261102130000_financial_integrity');
  db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');
  try {
    const installed = ultimateState(db);
    const hasHistory = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'").get();
    const rows = hasHistory ? db.prepare('SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations').all() : [];
    const history = checkHistory(rows, files, target, apply, installed);
    if (!installed) {
      db.exec(sqlBody(target.sql));
      if (!ultimateState(db)) fail('Ultimate repair validation failed.');
      if (history.complete) {
        const now = new Date().toISOString();
        db.prepare('INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES (?,?,?,?,?,1)').run(randomUUID(), target.checksum, now, target.name, now);
      }
    }
    if (db.prepare('PRAGMA foreign_key_check').all().length || db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') fail('SQLite integrity verification failed.');
    db.exec('COMMIT');
    return { installed, historyComplete: history.complete };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

// Inspect complete definitions, not individual installation markers.
export async function pgCatalog(client) {
  const columns = (await client.query(`SELECT c.relname AS table_name,a.attname AS name,a.attnotnull AS required,
    format_type(a.atttypid,a.atttypmod) AS type,pg_get_expr(d.adbin,d.adrelid) AS default_value
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND a.attnum>0 AND NOT a.attisdropped`)).rows;
  const constraints = (await client.query(`SELECT c.relname AS table_name,k.conname AS name,k.contype AS type,k.convalidated AS valid,
    k.condeferrable AS deferrable,k.condeferred AS deferred,pg_get_constraintdef(k.oid) AS definition
    FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'`)).rows;
  const indexes = (await client.query(`SELECT c.relname AS table_name,x.relname AS name,i.indisunique AS unique,i.indisvalid AS valid,
    ARRAY(SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY k(attnum,position)
      LEFT JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum ORDER BY k.position) AS columns,
    i.indoption::smallint[] AS options,pg_get_expr(i.indpred,i.indrelid) AS predicate
    FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_class x ON x.oid=i.indexrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'`)).rows;
  return { columns, constraints, indexes };
}
const pgSql = sql => sql.replace(/::(?:numeric|text|integer)/gi, '').replace(/[\s()\"]/g, '').toLowerCase();
const columnAt = (catalog, table, name) => catalog.columns.find(column => column.table_name === table && column.name === name);
const constraintAt = (catalog, table, name) => catalog.constraints.find(constraint => constraint.table_name === table && constraint.name === name);
const indexMatches = (catalog, table, name, columns, unique = false, descending = []) => {
  const index = catalog.indexes.find(index => index.table_name === table && index.name === name);
  return Boolean(index && index.valid && index.unique === unique && !index.predicate && JSON.stringify(index.columns) === JSON.stringify(columns)
    && index.options.every((option, position) => Boolean(option & 1) === descending.includes(position)));
};
export function familyState(catalog) {
  const foreign = [
    ['relationships', 'relationships_member1_tree_fkey', 'member1Id,treeId', 'id,treeId'],
    ['relationships', 'relationships_member2_tree_fkey', 'member2Id,treeId', 'id,treeId'],
    ['events', 'events_member_tree_fkey', 'memberId,treeId', 'id,treeId'],
    ['documents', 'documents_member_tree_fkey', 'memberId,treeId', 'id,treeId'],
    ['family_trees', 'family_trees_root_tree_fkey', 'rootMemberId,id', 'id,treeId'],
  ];
  const expected = foreign.map(([table, name, fields, references]) => {
    const constraint = constraintAt(catalog, table, name);
    return { present: Boolean(constraint), correct: Boolean(constraint?.valid && constraint.type === 'f' && constraint.deferrable && constraint.deferred
      && pgSql(constraint.definition) === pgSql(`FOREIGN KEY (${fields}) REFERENCES members(${references}) DEFERRABLE INITIALLY DEFERRED`)) };
  });
  const distinct = constraintAt(catalog, 'relationships', 'relationships_distinct_members');
  expected.push({ present: Boolean(distinct), correct: Boolean(distinct?.valid && distinct.type === 'c' && pgSql(distinct.definition) === pgSql('CHECK (member1Id <> member2Id)')) });
  for (const table of ['events', 'documents']) {
    const constraint = constraintAt(catalog, table, `${table}_memberId_fkey`);
    expected.push({ present: false, correct: Boolean(constraint?.valid && constraint.type === 'f' && !constraint.deferrable
      && pgSql(constraint.definition) === pgSql('FOREIGN KEY (memberId) REFERENCES members(id) ON UPDATE CASCADE ON DELETE SET NULL')) });
  }
  for (const [table, name, columns, unique] of [['members', 'members_id_treeId_key', ['id', 'treeId'], true], ['access_control', 'access_control_userId_treeId_idx', ['userId', 'treeId'], false]]) {
    expected.push({ present: catalog.indexes.some(index => index.name === name && index.table_name === table), correct: indexMatches(catalog, table, name, columns, unique) });
  }
  if (!expected.some(item => item.present)) return false;
  const weak = [['relationships', 'relationships_member1Id_fkey'], ['relationships', 'relationships_member2Id_fkey']];
  if (!expected.every(item => item.correct) || weak.some(([table, name]) => constraintAt(catalog, table, name))
    || catalog.indexes.some(index => index.table_name === 'access_control' && index.name === 'access_control_treeId_userId_idx')) fail('Family repair is partially installed or differs from reviewed constraints. Reconcile it before retrying.');
  return true;
}
export function oxfinState(catalog) {
  const transfer = catalog.columns.filter(column => column.table_name === 'transfer_requests');
  const expectedColumns = [['user_id', 'integer'], ['request_key', 'character varying(128)'], ['fingerprint', 'text'], ['response', 'jsonb'], ['created_at', 'timestamp with time zone']];
  const definitions = [['transfer_requests_pkey', 'p', 'PRIMARY KEY (user_id,request_key)'], ['transfer_requests_user_id_fkey', 'f', 'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT']];
  const indexSpecs = [['wallets', 'wallets_user_id_idx', ['user_id']], ['transactions', 'transactions_wallet_created_idx', ['wallet_id', 'created_at', 'id'], false, [1, 2]],
    ['accounts', 'accounts_user_id_idx', ['user_id']], ['sessions', 'sessions_user_id_idx', ['user_id']], ['password_history', 'password_history_user_id_idx', ['user_id', 'created_at'], false, [1]]];
  const markers = transfer.length || indexSpecs.some(([table, name]) => catalog.indexes.some(index => index.table_name === table && index.name === name));
  const ownershipMarkers = columnAt(catalog, 'wallets', 'user_id')?.required || columnAt(catalog, 'transactions', 'wallet_id')?.required;
  const ownership = columnAt(catalog, 'wallets', 'user_id')?.required && columnAt(catalog, 'transactions', 'wallet_id')?.required;
  const integrity = transfer.length === expectedColumns.length && ownership
    && expectedColumns.every(([name, type]) => transfer.some(column => column.name === name && column.type === type && column.required))
    && /^(?:now\(\)|CURRENT_TIMESTAMP)$/i.test(columnAt(catalog, 'transfer_requests', 'created_at')?.default_value || '')
    && definitions.every(([name, type, definition]) => { const constraint = constraintAt(catalog, 'transfer_requests', name); return constraint?.valid && constraint.type === type && pgSql(constraint.definition) === pgSql(definition); })
    && indexSpecs.every(spec => indexMatches(catalog, ...spec));
  if ((markers || ownershipMarkers) && !integrity) fail('OxFin integrity repair is partially installed or differs from reviewed schema. Reconcile it before retrying.');
  const checks = [['wallets', 'wallets_balance_valid', 'CHECK (balance >= 0 AND balance <= 9999999999.99 AND scale(balance) <= 2)'],
    ['wallets', 'wallets_currency_valid', "CHECK (currency ~ '^[A-Z]{3}$')"], ['transactions', 'transactions_amount_valid', 'CHECK (abs(amount) <= 9999999999.99 AND scale(amount) <= 2)']];
  const precisionMarkers = checks.some(([table, name]) => constraintAt(catalog, table, name));
  const precision = ['wallets', 'transactions'].every((table, index) => columnAt(catalog, table, ['balance', 'amount'][index])?.type === 'numeric')
    && checks.every(([table, name, definition]) => { const constraint = constraintAt(catalog, table, name); return constraint?.valid && constraint.type === 'c' && pgSql(constraint.definition) === pgSql(definition); });
  if (precisionMarkers && !precision) fail('OxFin precision repair is partially installed or has different checks. Reconcile it before retrying.');
  return { integrity, precision };
}
export async function repairPostgres(client, { product, apply = false }) {
  await client.query('BEGIN');
  try {
    await client.query("SET LOCAL search_path TO public, pg_catalog; SET LOCAL statement_timeout='30s'; SET LOCAL lock_timeout='5s'");
    let historyComplete = true;
    if (product === 'family') {
      const files = migrationFiles('family');
      const target = files.find(file => file.name === '20261102120000_tree_integrity');
      const installed = familyState(await pgCatalog(client));
      const hasHistory = (await client.query("SELECT to_regclass('public._prisma_migrations') AS present")).rows[0].present;
      const rows = hasHistory ? (await client.query('SELECT migration_name,checksum,finished_at,rolled_back_at FROM public._prisma_migrations')).rows : [];
      const history = checkHistory(rows, files, target, apply, installed);
      historyComplete = history.complete;
      if (!installed) {
        await client.query(sqlBody(target.sql));
        if (!familyState(await pgCatalog(client))) fail('Family repair validation failed.');
        if (history.complete) await client.query('INSERT INTO public._prisma_migrations(id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES ($1,$2,now(),$3,now(),1)', [randomUUID(), target.checksum, target.name]);
      }
    } else if (product === 'oxfin') {
      const state = oxfinState(await pgCatalog(client));
      const base = 'FinSync/OxFin/ox-fin-backend/infrastructure/migrations';
      if (!state.integrity) await client.query(sqlBody(read(`${base}/20261102_integrity.sql`)));
      if (!state.precision) await client.query(sqlBody(read(`${base}/20261103_financial_precision.sql`)));
      const verified = oxfinState(await pgCatalog(client));
      if (!verified.integrity || !verified.precision) fail('OxFin repair validation failed.');
    } else fail('A PostgreSQL repair product is required.');
    await client.query('SET CONSTRAINTS ALL IMMEDIATE');
    await client.query(apply ? 'COMMIT' : 'ROLLBACK');
    return { historyComplete };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
}
export async function runRepair(options, { backupDirectory = path.join(root, '.tmp/schema-repairs') } = {}) {
  if (options.product === 'ultimate') {
    const { createSQLiteBackup } = await import('../growthtrack-ultimate/server/domains/sqliteBackup.js');
    const backup = await createSQLiteBackup({ source: options.databaseFile, directory: backupDirectory });
    // Keep both original backup/restore-proof files intact after verification.
    const rehearsalFile = backup.backup.replace(/\.db$/, '-rehearsal.db');
    fs.copyFileSync(backup.backup, rehearsalFile, fs.constants.COPYFILE_EXCL);
    fs.chmodSync(rehearsalFile, 0o600);
    const rehearsal = new DatabaseSync(rehearsalFile);
    let result;
    try { result = repairSQLite(rehearsal, options); } finally { rehearsal.close(); }
    if (!options.apply) return result;
    const db = new DatabaseSync(options.databaseFile);
    try { return repairSQLite(db, options); } finally { db.close(); }
  }
  const require = createRequire(path.join(root, 'FinSync/OxFin/ox-fin-web/package.json'));
  const { Client } = require('pg');
  const client = new Client({ connectionString: options.databaseUrl, connectionTimeoutMillis: 5000 });
  try {
    await client.connect();
    const result = await repairPostgres(client, { ...options, apply: false });
    return options.apply ? await repairPostgres(client, options) : result;
  } finally { await client.end(); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArguments(process.argv.slice(2));
    const result = await runRepair(options);
    console.log(`${options.product}: ${options.apply ? 'local repair applied' : 'rehearsal passed; source records unchanged'}.`);
    if (!result.historyComplete) console.log('Prior Prisma history must be reconciled before --apply-local. No migration history was invented.');
  } catch (error) {
    const detail = error instanceof RepairError ? error.message : `Operation failed${/^[A-Z0-9_]+$/.test(error.code || '') ? ` (${error.code})` : ''}. Check schema prerequisites and existing records.`;
    console.error(`Schema repair stopped. ${detail}`);
    process.exitCode = 1;
  }
}
