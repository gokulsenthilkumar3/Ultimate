import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { createRequire } from 'node:module';
import { parseArguments, sqlBody, migrationFiles, repairSQLite, ultimateState, runRepair, familyState, oxfinState, repairPostgres } from '../scripts/apply-schema-repairs.mjs';

const files = migrationFiles('ultimate');
const target = files.find(file => file.name === '20261102130000_financial_integrity');
function baseline(filename = ':memory:', withHistory = true) {
  const db = new DatabaseSync(filename);
  for (const file of files.filter(file => file.name < target.name)) db.exec(file.sql);
  if (withHistory) {
    db.exec('CREATE TABLE _prisma_migrations(id TEXT PRIMARY KEY,checksum TEXT NOT NULL,finished_at DATETIME,migration_name TEXT NOT NULL,logs TEXT,rolled_back_at DATETIME,started_at DATETIME NOT NULL,applied_steps_count INTEGER NOT NULL DEFAULT 0)');
    const insert = db.prepare('INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES (?,?,CURRENT_TIMESTAMP,?,CURRENT_TIMESTAMP,1)');
    for (const file of files.filter(file => file.name < target.name)) insert.run(randomUUID(), file.checksum, file.name);
  }
  db.exec(`INSERT INTO User(id,email,passwordHash,fullName,referralCode,updatedAt) VALUES ('owner','owner@example.test','hash','Owner','owner',CURRENT_TIMESTAMP);
    INSERT INTO "Transaction"(id,userId,amount) VALUES ('t','owner',0.29)`);
  return db;
}

test('CLI selects one explicit product/database; never uses application DATABASE_URL', () => {
  assert.throws(() => parseArguments([], {}), /Select exactly one/);
  assert.throws(() => parseArguments(['--product=ultimate'], { DATABASE_URL: 'file:secret.db' }), /explicit local/);
  assert.throws(() => parseArguments(['--product=family', '--product=oxfin'], {}), /Use --product/);
  assert.throws(() => parseArguments(['--product=ultimate'], { SCHEMA_REPAIR_DATABASE_URL: 'file://server/share/database.db' }), /explicit local/);
  assert.equal(parseArguments(['--product=ultimate', '--database-file=fixture.db'], {}).apply, false);
  assert.throws(() => parseArguments(['--product=family', '--apply-local'], { SCHEMA_REPAIR_DATABASE_URL: 'postgres://u:secret@example.test/db' }), /local PostgreSQL/);
  assert.throws(() => parseArguments(['--product=oxfin', '--apply-local'], { SCHEMA_REPAIR_DATABASE_URL: 'postgres://localhost/db?host=example.test' }), /overrides/);
});

test('outer transaction stripping preserves trigger bodies', () => {
  const body = sqlBody(target.sql);
  assert.doesNotMatch(body, /^BEGIN IMMEDIATE;|^COMMIT;/m);
  assert.match(body, /BEGIN SELECT RAISE/);
});

test('Ultimate apply records the checked migration atomically and can be repeated', () => {
  const db = baseline();
  try {
    const count = db.prepare('SELECT count(*) AS n FROM _prisma_migrations').get().n;
    assert.deepEqual(repairSQLite(db, { apply: true }), { installed: false, historyComplete: true });
    assert.equal(db.prepare('SELECT amountMinor FROM "Transaction"').get().amountMinor, 29);
    assert.equal(db.prepare('SELECT checksum FROM _prisma_migrations WHERE migration_name=?').get(target.name).checksum, target.checksum);
    assert.deepEqual(repairSQLite(db, { apply: true }), { installed: true, historyComplete: true });
    assert.equal(db.prepare('SELECT count(*) AS n FROM _prisma_migrations').get().n, count + 1);
  } finally { db.close(); }
});

test('Ultimate apply refuses unreconciled, altered, partial, and unrecorded schemas', () => {
  for (const scenario of ['missing', 'checksum', 'partial', 'unrecorded']) {
    const db = baseline(':memory:', scenario !== 'missing');
    try {
      if (scenario === 'checksum') db.exec("UPDATE _prisma_migrations SET checksum='altered' WHERE migration_name=(SELECT min(migration_name) FROM _prisma_migrations)");
      if (scenario === 'partial') db.exec('ALTER TABLE "Transaction" ADD COLUMN amountMinor INTEGER');
      if (scenario === 'unrecorded') db.exec(target.sql);
      assert.throws(() => repairSQLite(db, { apply: true }), /history|checksums|partially installed|without its Prisma/);
      assert.equal(db.prepare('SELECT count(*) AS n FROM "Transaction"').get().n, 1);
    } finally { db.close(); }
  }
});

test('invalid populated money rolls back schema and history together', () => {
  const db = baseline();
  try {
    db.exec('UPDATE "Transaction" SET amount=1.001');
    const count = db.prepare('SELECT count(*) AS n FROM _prisma_migrations').get().n;
    assert.throws(() => repairSQLite(db, { apply: true }), /two decimal/);
    assert.equal(ultimateState(db), false);
    assert.equal(db.prepare('SELECT count(*) AS n FROM _prisma_migrations').get().n, count);
    assert.equal(db.prepare('SELECT amount FROM "Transaction"').get().amount, 1.001);
  } finally { db.close(); }
});

test('SQLite rehearsal upgrades only its verified copy and preserves the source bytes', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-cli-test-'));
  const filename = path.join(directory, 'source.db');
  baseline(filename).close();
  const hash = () => createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
  const before = hash();
  const result = await runRepair({ product: 'ultimate', databaseFile: filename, apply: false }, { backupDirectory: path.join(directory, 'backups') });
  assert.equal(result.historyComplete, true);
  assert.equal(hash(), before);
  const source = new DatabaseSync(filename);
  try { assert.equal(ultimateState(source), false); } finally { source.close(); }
  const manifestFile = fs.readdirSync(path.join(directory, 'backups')).find(file => file.endsWith('.json'));
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'backups', manifestFile), 'utf8'));
  assert.equal(manifest.restoreVerified, true);
  const restored = new DatabaseSync(path.join(directory, 'backups', manifest.restoreCheck));
  try { assert.equal(ultimateState(restored), false); } finally { restored.close(); }
  const rehearsed = new DatabaseSync(path.join(directory, 'backups', manifest.backup.replace(/\.db$/, '-rehearsal.db')));
  try { assert.equal(ultimateState(rehearsed), true); } finally { rehearsed.close(); }
  // Retain the temporary backup artifacts for inspection; never delete user files.
});

test('PostgreSQL target detection rejects lone markers rather than skipping partial repairs', () => {
  assert.equal(familyState({ columns: [], constraints: [], indexes: [] }), false);
  assert.throws(() => familyState({ columns: [], indexes: [], constraints: [{ table_name: 'family_trees', name: 'family_trees_root_tree_fkey' }] }), /partially installed/);
  assert.deepEqual(oxfinState({ columns: [], constraints: [], indexes: [] }), { integrity: false, precision: false });
  assert.throws(() => oxfinState({ columns: [{ table_name: 'transfer_requests', name: 'user_id', required: true, type: 'integer' }], constraints: [], indexes: [] }), /partially installed/);
});

test('PostgreSQL errors always roll back without committing or exposing credentials', async () => {
  const calls = [];
  const client = { query: async sql => { calls.push(sql); if (sql.includes('FROM pg_attribute')) throw new Error('private database detail'); return { rows: [] }; } };
  await assert.rejects(repairPostgres(client, { product: 'oxfin' }), /private database detail/);
  assert.equal(calls.at(-1), 'ROLLBACK');
  assert.equal(calls.includes('COMMIT'), false);
});

const pgTestUrl = process.env.SCHEMA_TEST_DATABASE_URL;
const pgSkip = pgTestUrl ? false : 'Set SCHEMA_TEST_DATABASE_URL to a disposable local PostgreSQL database ending in _test.';
async function disposableDatabase(check) {
  const source = new URL(pgTestUrl);
  assert.ok(['postgres:', 'postgresql:'].includes(source.protocol));
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(source.hostname));
  assert.match(source.pathname, /^\/[A-Za-z0-9_]+_test$/);
  assert.equal(source.search, '');
  const require = createRequire(new URL('../FinSync/OxFin/ox-fin-web/package.json', import.meta.url));
  const { Client } = require('pg');
  const admin = new Client({ connectionString: source.href, connectionTimeoutMillis: 5000 });
  await admin.connect();
  const name = `schema_cli_${randomUUID().replaceAll('-', '')}_test`;
  try { await admin.query(`CREATE DATABASE "${name}"`); } finally { await admin.end(); }
  source.pathname = `/${name}`;
  const client = new Client({ connectionString: source.href, connectionTimeoutMillis: 5000 });
  try { await client.connect(); await check(client); } finally { await client.end(); }
  // Dedicated generated databases stay in the disposable test server for inspection.
}

test('PostgreSQL Family rehearsal rolls back; apply records history and validates complete catalog', { skip: pgSkip }, async () => {
  await disposableDatabase(async client => {
    const family = migrationFiles('family');
    const repair = family.find(file => file.name === '20261102120000_tree_integrity');
    for (const file of family.filter(file => file.name < repair.name)) await client.query(sqlBody(file.sql));
    await client.query('CREATE TABLE _prisma_migrations(id TEXT PRIMARY KEY,checksum TEXT NOT NULL,finished_at TIMESTAMPTZ,migration_name TEXT NOT NULL,logs TEXT,rolled_back_at TIMESTAMPTZ,started_at TIMESTAMPTZ NOT NULL,applied_steps_count INTEGER NOT NULL DEFAULT 0)');
    for (const file of family.filter(file => file.name < repair.name)) await client.query('INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name,started_at,applied_steps_count) VALUES($1,$2,now(),$3,now(),1)', [randomUUID(), file.checksum, file.name]);
    assert.equal((await repairPostgres(client, { product: 'family' })).historyComplete, true);
    assert.equal((await client.query('SELECT count(*) FROM _prisma_migrations WHERE migration_name=$1', [repair.name])).rows[0].count, '0');
    await repairPostgres(client, { product: 'family', apply: true });
    assert.equal((await client.query('SELECT checksum FROM _prisma_migrations WHERE migration_name=$1', [repair.name])).rows[0].checksum, repair.checksum);
    await repairPostgres(client, { product: 'family' });
  });
});

test('PostgreSQL OxFin replays both repairs, rolls rehearsal back, and validates full installation', { skip: pgSkip }, async () => {
  await disposableDatabase(async client => {
    const root = new URL('../', import.meta.url);
    const initial = fs.readFileSync(new URL('FinSync/OxFin/ox-fin-backend/infrastructure/init.sql', root), 'utf8');
    const legacy = initial.slice(0, initial.indexOf('-- Fail rather than discard'))
      .replace('user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n    balance NUMERIC', 'user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,\n    balance NUMERIC')
      .replace(/wallet_id INTEGER NOT NULL/g, 'wallet_id INTEGER')
      .replace(/balance NUMERIC NOT NULL/g, 'balance NUMERIC(12,2) NOT NULL')
      .replace(/amount NUMERIC NOT NULL/g, 'amount NUMERIC(12,2) NOT NULL');
    // Normalize checked-in line endings before deriving the legacy fixture.
    await client.query(sqlBody(legacy.replace(/\r\n/g, '\n').replace('user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,\n    balance', 'user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,\n    balance')));
    await client.query("INSERT INTO users(id,email) VALUES(1,'fixture@example.test'); INSERT INTO wallets(id,user_id,balance,currency) VALUES(1,1,.29,'USD')");
    await repairPostgres(client, { product: 'oxfin' });
    assert.equal((await client.query("SELECT to_regclass('public.transfer_requests') AS present")).rows[0].present, null);
    await repairPostgres(client, { product: 'oxfin', apply: true });
    assert.equal((await client.query("SELECT balance::text FROM wallets WHERE id=1")).rows[0].balance, '0.29');
    assert.equal((await client.query("SELECT format_type(atttypid,atttypmod) AS type FROM pg_attribute WHERE attrelid='wallets'::regclass AND attname='balance'")).rows[0].type, 'numeric');
    await repairPostgres(client, { product: 'oxfin' });
  });
});
