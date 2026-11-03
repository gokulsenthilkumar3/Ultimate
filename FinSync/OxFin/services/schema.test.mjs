import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { buyOxInDb, transferOxInDb, InsufficientOxBalance } from './ox-service/src/db.ts';
const require = createRequire(new URL('../ox-fin-web/package.json', import.meta.url));
const { Client } = require('pg');
const connectionString = process.env.SCHEMA_TEST_DATABASE_URL;

test('reference service schemas support their SQL contracts and reject invalid records', {skip: !connectionString && 'Set SCHEMA_TEST_DATABASE_URL to an isolated local test database'}, async () => {
  const url = new URL(connectionString);
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname) && /test/i.test(url.pathname), 'Use an explicitly named local test database');
  const client = new Client({connectionString});
  await client.connect();
  try {
    for (const service of ['wallet','payments','bills','ox']) {
      await client.query('BEGIN');
      try {
        const schema = `schema_review_finsync_${service}_${process.pid}`;
        await client.query(`CREATE SCHEMA "${schema}"`);
        await client.query(`SET LOCAL search_path TO "${schema}"`);
        await client.query(readFileSync(new URL(`./${service}-service/schema.sql`, import.meta.url), 'utf8').replace(/^BEGIN;|^COMMIT;/gm, ''));
        const rejects = async (sql, code = '23514') => {
          await client.query('SAVEPOINT invalid');
          await assert.rejects(client.query(sql), error => error.code === code);
          await client.query('ROLLBACK TO SAVEPOINT invalid');
        };
        if (service === 'wallet') {
          await client.query("INSERT INTO wallets(id,user_id,currency,balance) VALUES ('wlt_1','external-user','USD',.29)");
          assert.equal((await client.query("SELECT balance::text FROM wallets WHERE user_id='external-user'")).rows[0].balance, '0.29');
          await rejects("UPDATE wallets SET balance='NaN'");
          await rejects("UPDATE wallets SET balance=-1");
          await rejects("UPDATE wallets SET currency='usd'");
        } else if (service === 'payments') {
          await client.query("INSERT INTO payments(id,user_id,source,destination,amount,currency,country,rail,status) VALUES ('pay_1','external-user','wallet:u','biller:b',.29,'USD','US','ACH','pending')");
          await client.query("UPDATE payments SET status='succeeded',external_reference='ACH-1',updated_at=now() WHERE id='pay_1'");
          await rejects("UPDATE payments SET amount=0");
          await rejects("UPDATE payments SET amount='Infinity'");
          await rejects("UPDATE payments SET status='unknown'");
        } else if (service === 'bills') {
          await client.query("INSERT INTO bills(id,user_id,biller_id,country,service_type,amount_due,currency,due_date,status,source) VALUES ('bill_1','external-user','biller-b','US','utility',.29,'USD',now(),'scheduled','manual')");
          await client.query("INSERT INTO autopay_rules(id,user_id,biller_id,funding_source,type,schedule,max_amount_per_charge) VALUES ('apr_1','external-user','biller-b','wallet','fixed_amount','on_due_date',.29)");
          assert.equal((await client.query("SELECT count(*)::int AS n FROM bills WHERE status='scheduled' AND due_date<=now()")).rows[0].n, 1);
          await rejects("UPDATE autopay_rules SET max_amount_per_charge=0");
          await rejects("UPDATE bills SET amount_due='NaN'");
        } else {
          await client.query("INSERT INTO ox_wallets(user_id,balance_ox) VALUES ('external-user',.12345678)");
          await client.query("INSERT INTO ox_transactions(id,user_id,type,amount_ox,fee_ox) VALUES ('ox_tx_1','external-user','buy',.12345678,.0001)");
          assert.equal((await client.query('SELECT balance_ox::text FROM ox_wallets')).rows[0].balance_ox, '0.12345678');
          await rejects("UPDATE ox_wallets SET balance_ox=-1");
          await rejects("UPDATE ox_transactions SET user_id='missing-user'", '23503');
          await rejects("DELETE FROM ox_wallets", '23503');
        }
      } finally { await client.query('ROLLBACK'); }
    }
  } finally { await client.end(); }
});

test('OX buys and transfers use stored balances and roll back balances with failed ledger writes', {skip: !connectionString && 'Set SCHEMA_TEST_DATABASE_URL to an isolated local test database'}, async () => {
  const url = new URL(connectionString);
  assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname) && /test/i.test(url.pathname), 'Use an explicitly named local test database');
  const client = new Client({connectionString}); await client.connect();
  try {
    await client.query('BEGIN');
    const schema = `schema_review_ox_flows_${process.pid}`;
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}"`);
    await client.query(readFileSync(new URL('./ox-service/schema.sql', import.meta.url), 'utf8').replace(/^BEGIN;|^COMMIT;/gm,''));
    // Run the actual repository helpers against PostgreSQL, translating only
    // transaction boundaries into savepoints so the whole fixture rolls back.
    const database = {async connect() { return {
      query(sql,params) {
        const boundary = {BEGIN:'SAVEPOINT ox_write',COMMIT:'RELEASE SAVEPOINT ox_write',ROLLBACK:'ROLLBACK TO SAVEPOINT ox_write'}[sql];
        return client.query(boundary || sql,params);
      }, release() {},
    }; }};
    const first = await buyOxInDb('buyer',101,'buy_1',database);
    assert.equal(Number(first.wallet.balance_ox),99);
    // A fresh call has no memory state; it must add to the persisted 99 OX.
    const second = await buyOxInDb('buyer',202,'buy_2',database);
    assert.equal(Number(second.wallet.balance_ox),297);
    await assert.rejects(buyOxInDb('buyer',101,'buy_1',database), error=>error.code==='23505');
    assert.equal(Number((await client.query("SELECT balance_ox FROM ox_wallets WHERE user_id='buyer'")).rows[0].balance_ox),297);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM ox_transactions')).rows[0].n,2);
    const transfer = await transferOxInDb('buyer','recipient',1,true,'out_1','in_1',database);
    assert.equal(Number(transfer.senderWallet.balance_ox),295.99);
    assert.equal(Number(transfer.receiverWallet.balance_ox),1);
    await assert.rejects(transferOxInDb('buyer','recipient',1,true,'out_2','buy_1',database), error=>error.code==='23505');
    assert.equal(Number((await client.query("SELECT balance_ox FROM ox_wallets WHERE user_id='recipient'")).rows[0].balance_ox),1);
    assert.equal((await client.query('SELECT count(*)::int AS n FROM ox_transactions')).rows[0].n,4);
    await assert.rejects(transferOxInDb('missing-sender','new-recipient',1,true,'out_3','in_3',database), InsufficientOxBalance);
    assert.equal((await client.query("SELECT count(*)::int AS n FROM ox_wallets WHERE user_id IN ('missing-sender','new-recipient')")).rows[0].n,0);
  } finally { await client.query('ROLLBACK'); await client.end(); }
});
