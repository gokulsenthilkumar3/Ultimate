import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { CREATE_TABLES_SQL, initializeSchema } from '../src/db/schema.ts';

function adapter(db) {
  return {
    async execAsync(sql) { db.exec(sql); },
    async getAllAsync(sql) { return db.prepare(sql).all(); },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      try { await task(); db.exec('COMMIT'); }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  };
}
const legacyDDL = () => CREATE_TABLES_SQL
  .replace(/^\s*\w+_minor INTEGER,\r?\n/gm, '')
  .replace(/\s*CREATE TRIGGER[\s\S]*?END;/g, '')
  .replace(/(CREATE TABLE IF NOT EXISTS budgets \([\s\S]*?category_id INTEGER) REFERENCES categories\(id\)/, '$1');

test('native initializer preserves installed rows and backfills every nullable money field', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys=ON'); db.exec(legacyDDL());
    db.exec(`INSERT INTO expenses(amount,date) VALUES (.29,'2026-11-01');
      INSERT INTO recurring_templates(name,type,amount,installment_amt,min_amount,max_amount,frequency,start_date,next_due_date)
      VALUES ('Plan','variable',NULL,.29,.1,.2,'monthly','2026-11-01','2026-11-01')`);
    await initializeSchema(adapter(db)); await initializeSchema(adapter(db));
    assert.equal(db.prepare('SELECT amount_minor FROM expenses').get().amount_minor, 29);
    const row = db.prepare('SELECT amount_minor,installment_amt_minor,min_amount_minor,max_amount_minor FROM recurring_templates').get();
    assert.deepEqual({ ...row }, {amount_minor:null, installment_amt_minor:29, min_amount_minor:10, max_amount_minor:20});
    db.exec("INSERT INTO recurring_entries(template_id,due_date) VALUES (1,'2026-11-01')");
    assert.throws(() => db.exec("INSERT INTO recurring_entries(template_id,due_date) VALUES (1,'2026-11-01')"), /UNIQUE/);
    assert.throws(() => db.exec("INSERT INTO budgets(month,category_id,amount) VALUES ('2026-11',999,1)"), /Budget category/);
    db.exec("INSERT INTO categories(id,name) VALUES (100,'Custom'); INSERT INTO budgets(month,category_id,amount) VALUES ('2026-11',100,1)");
    assert.throws(() => db.exec('DELETE FROM categories WHERE id=100'), /referenced by a budget/);
    assert.throws(() => db.exec('UPDATE categories SET id=101 WHERE id=100'), /referenced by a budget/);
  } finally { db.close(); }
});

test('invalid installed decimal precision rolls back the entire additive upgrade', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(legacyDDL()); db.exec("INSERT INTO expenses(amount,date) VALUES (1.001,'2026-11-01')");
    await assert.rejects(initializeSchema(adapter(db)), /two decimal places/);
    assert.equal(db.prepare('SELECT amount FROM expenses').get().amount, 1.001);
    assert.equal(db.prepare('PRAGMA table_info(expenses)').all().some(c => c.name === 'amount_minor'), false);
  } finally { db.close(); }
});

test('existing orphan budgets prevent upgrading without deleting the record', async () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(legacyDDL()); db.exec("INSERT INTO budgets(month,category_id,amount) VALUES ('2026-11',999,1)");
    await assert.rejects(initializeSchema(adapter(db)), /missing references/);
    assert.equal(db.prepare('SELECT count(*) AS n FROM budgets').get().n, 1);
    assert.equal(db.prepare('PRAGMA table_info(budgets)').all().some(c => c.name === 'amount_minor'), false);
  } finally { db.close(); }
});
