// Synthetic PostgreSQL checks. Never load an application's environment or database.
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { verifyNiftyLensSchema } from '../Equity/NiftyLens/tests/schema-postgres.mjs';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const configured = process.env.SCHEMA_TEST_DATABASE_URL;
const skip = configured ? false : 'Set SCHEMA_TEST_DATABASE_URL to a disposable local database ending in _test.';
const sqlBody = sql => sql.replace(/^\s*(?:BEGIN|COMMIT);\s*$/gm, '');

async function isolated(product, check) {
  const url = new URL(configured);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
    || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || !/^\/[a-zA-Z0-9_]+_test$/.test(url.pathname)) {
    throw new Error('Schema tests require an explicit local PostgreSQL database ending in _test.');
  }
  const require = createRequire(path.join(root, 'FinSync/OxFin/ox-fin-web/package.json'));
  const { Client } = require('pg');
  const client = new Client({ connectionString: url.href, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout='15s'; SET LOCAL lock_timeout='5s'");
    const schema = `schema_review_${product}_${randomUUID().replaceAll('-', '')}`;
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}"`);
    await check(client);
  } finally {
    try { await client.query('ROLLBACK'); } finally { await client.end(); }
  }
}

async function rejectsSql(client, sql, code) {
  await client.query('SAVEPOINT invalid');
  await assert.rejects(client.query(sql), error => error.code === code);
  await client.query('ROLLBACK TO SAVEPOINT invalid');
}

test('OxFin PostgreSQL bootstrap enforces wallet ownership and transfer replay uniqueness', { skip }, async () => {
  await isolated('oxfin', async client => {
    await client.query(sqlBody(read('FinSync/OxFin/ox-fin-backend/infrastructure/init.sql')));
    await client.query("INSERT INTO users(id,email) VALUES (1,'test@example.test'); INSERT INTO wallets(id,user_id,balance,currency) VALUES (1,1,1.00,'USD')");
    await client.query("INSERT INTO transfer_requests(user_id,request_key,fingerprint,response) VALUES (1,'test-key','test','{}')");
    await rejectsSql(client, "INSERT INTO transactions(wallet_id,amount,type) VALUES (NULL,1,'deposit')", '23502');
    await rejectsSql(client, "INSERT INTO transactions(wallet_id,amount,type) VALUES (999,1,'deposit')", '23503');
    await rejectsSql(client, "INSERT INTO transfer_requests(user_id,request_key,fingerprint,response) VALUES (1,'test-key','test','{}')", '23505');
  });
});

test('OxFin forward migrations preserve legacy balances and reject invalid financial writes', { skip }, async () => {
  await isolated('oxfin_upgrade', async client => {
    const base = 'FinSync/OxFin/ox-fin-backend/infrastructure';
    await client.query(sqlBody(read(`${base}/init.sql`)));
    // Reproduce the former DECIMAL(12,2), nullable-owner installation.
    await client.query(`DROP TABLE transfer_requests;
      ALTER TABLE wallets DROP CONSTRAINT wallets_balance_valid, DROP CONSTRAINT wallets_currency_valid,
        ALTER COLUMN balance TYPE NUMERIC(12,2), ALTER COLUMN user_id DROP NOT NULL;
      ALTER TABLE transactions DROP CONSTRAINT transactions_amount_valid,
        ALTER COLUMN amount TYPE NUMERIC(12,2), ALTER COLUMN wallet_id DROP NOT NULL;
      INSERT INTO users(id,email) VALUES (1,'legacy@example.test');
      INSERT INTO wallets(id,user_id,balance,currency) VALUES (1,1,.29,'USD');
      INSERT INTO transactions(id,wallet_id,amount,type) VALUES (1,1,.29,'deposit');`);
    for (const migration of ['20261102_integrity.sql', '20261103_financial_precision.sql']) {
      await client.query(sqlBody(read(`${base}/migrations/${migration}`)));
    }
    assert.equal((await client.query('SELECT balance::text FROM wallets WHERE id=1')).rows[0].balance, '0.29');
    assert.equal((await client.query('SELECT amount::text FROM transactions WHERE id=1')).rows[0].amount, '0.29');
    await rejectsSql(client, "UPDATE transactions SET amount=1.001 WHERE id=1", '23514');
    for (const balance of ['-1', "'NaN'", "'Infinity'", "'-Infinity'"]) {
      await rejectsSql(client, `UPDATE wallets SET balance=${balance} WHERE id=1`, '23514');
    }
    await rejectsSql(client, "UPDATE wallets SET currency='usd' WHERE id=1", '23514');
    await rejectsSql(client, 'UPDATE wallets SET user_id=NULL WHERE id=1', '23502');
    await rejectsSql(client, 'UPDATE transactions SET wallet_id=NULL WHERE id=1', '23502');
  });
});

test('NiftyLens PostgreSQL migrations validate market records and enforce owner RLS', { skip }, async () => {
  await isolated('nifty', client => verifyNiftyLensSchema(client, randomUUID().replaceAll('-', '')));
});

test('NiftyLens forward upgrade repairs legacy manually provisioned tables', { skip }, async () => {
  await isolated('nifty_legacy', client => verifyNiftyLensSchema(client, randomUUID().replaceAll('-', ''), { legacyManualTables: true }));
});

test('Family PostgreSQL migrations enforce tree boundaries and preserve cascades', { skip }, async () => {
  await isolated('family', async client => {
    const base = 'Family Connect/familyconnect/backend/prisma/migrations';
    for (const directory of fs.readdirSync(path.join(root, base)).sort()) {
      const file = `${base}/${directory}/migration.sql`;
      if (fs.existsSync(path.join(root, file))) await client.query(sqlBody(read(file)));
    }
    await client.query(`INSERT INTO users(id,email,"passwordHash",name,"updatedAt") VALUES ('u','test@example.test','hash','User',now());
      INSERT INTO family_trees(id,name,"ownerId","updatedAt") VALUES ('a','A','u',now()),('b','B','u',now());
      INSERT INTO members(id,"treeId",name,"createdById","updatedAt") VALUES ('a1','a','A1','u',now()),('a2','a','A2','u',now()),('b1','b','B1','u',now());`);
    await client.query('SET CONSTRAINTS ALL IMMEDIATE');
    await rejectsSql(client, `INSERT INTO relationships(id,"treeId","member1Id","member2Id",type) VALUES ('bad','a','a1','b1','spouse')`, '23503');
    await rejectsSql(client, `INSERT INTO relationships(id,"treeId","member1Id","member2Id",type) VALUES ('bad','a','a1','a1','spouse')`, '23514');
    await rejectsSql(client, `UPDATE family_trees SET "rootMemberId"='b1' WHERE id='a'`, '23503');
    await rejectsSql(client, `INSERT INTO events(id,"treeId","memberId",type,title,date,photos) VALUES ('bad','a','b1','birthday','Bad',now(),ARRAY[]::text[])`, '23503');
    await rejectsSql(client, `INSERT INTO documents(id,"treeId","memberId",type,"fileUrl","fileName") VALUES ('bad','a','b1','other','/uploads/test','test')`, '23503');
    await client.query(`INSERT INTO members(id,"treeId",name,"createdById","updatedAt") VALUES ('a3','a','A3','u',now());
      INSERT INTO events(id,"treeId","memberId",type,title,date,photos) VALUES ('e','a','a3','birthday','Event',now(),ARRAY[]::text[]);
      INSERT INTO documents(id,"treeId","memberId",type,"fileUrl","fileName") VALUES ('d','a','a3','other','/uploads/test','test');
      DELETE FROM members WHERE id='a3';`);
    assert.equal((await client.query("SELECT \"memberId\" FROM events WHERE id='e'")).rows[0].memberId, null);
    assert.equal((await client.query("SELECT \"memberId\" FROM documents WHERE id='d'")).rows[0].memberId, null);
    await client.query(`UPDATE family_trees SET "rootMemberId"='a1' WHERE id='a';
      INSERT INTO relationships(id,"treeId","member1Id","member2Id",type) VALUES ('valid','a','a1','a2','spouse');
      DELETE FROM family_trees WHERE id='a';`);
    assert.equal((await client.query("SELECT count(*) FROM members WHERE \"treeId\"='a'")).rows[0].count, '0');
    assert.equal((await client.query('SELECT count(*) FROM relationships')).rows[0].count, '0');
    assert.equal((await client.query("SELECT count(*) FROM members WHERE \"treeId\"='b'")).rows[0].count, '1');
  });
});
