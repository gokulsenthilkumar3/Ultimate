import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const migrations = (before = () => {}) => {
 const db = new DatabaseSync(':memory:');
 db.exec('PRAGMA foreign_keys=ON');
 const dir = new URL('growthtrack-ultimate/prisma/migrations/', root);
 for (const name of fs.readdirSync(dir).sort()) {
  const file = new URL(`${name}/migration.sql`, dir);
  if (fs.existsSync(file)) {
   before(db, name);
   db.exec(fs.readFileSync(file, 'utf8'));
  }
 }
 return db;
};
test('Ultimate migration replay and fresh installation match columns, defaults, keys, indexes and triggers', () => {
 const replay = migrations(); const fresh = new DatabaseSync(':memory:');
 fresh.exec(read('growthtrack-ultimate/prisma/fresh-schema.sql'));
 const shape = db => db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(({name}) => ({
  name,
  columns: db.prepare(`PRAGMA table_info("${name}")`).all().map(c=>[c.name,c.type,c.notnull,c.pk,c.dflt_value]).sort(),
  indexes: db.prepare(`PRAGMA index_list("${name}")`).all().map(i=>[i.name,i.unique,i.partial,db.prepare(`PRAGMA index_info("${i.name}")`).all().map(c=>c.name)]).sort(),
  foreignKeys: db.prepare(`PRAGMA foreign_key_list("${name}")`).all().map(k=>[k.seq,k.table,k.from,k.to,k.on_update,k.on_delete,k.match]).sort(),
  triggers: db.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger' AND tbl_name=? ORDER BY name").all(name).map(t=>[t.name,t.sql.replace(/\s+/g,' ').trim()]),
 }));
 assert.deepEqual(shape(replay), shape(fresh)); replay.close(); fresh.close();
});

test('Ultimate restored baseline preserves original user records and supplies timestamp defaults', () => {
 const db=migrations((database,name)=>{
  if(name==='20260820120000_restore_baseline')database.exec(`INSERT INTO User(id,email,passwordHash,fullName,createdAt,updatedAt)
   VALUES ('legacy','legacy@example.test','original-hash','Original','2026-08-17 12:00:00','2026-08-18 13:00:00')`);
 });
 try {
  const row=db.prepare("SELECT * FROM User WHERE id='legacy'").get();
  assert.equal(row.passwordHash,'original-hash');
  assert.equal(row.fullName,'Original');
  assert.equal(row.createdAt,'2026-08-17 12:00:00');
  assert.equal(row.updatedAt,'2026-08-18 13:00:00');
  assert.equal(row.referralCode,'legacy');
  db.exec("INSERT INTO User(id,email,passwordHash,fullName,referralCode) VALUES ('new','new@example.test','hash','New','new')");
  assert.ok(db.prepare("SELECT updatedAt FROM User WHERE id='new'").get().updatedAt);
 } finally {db.close();}
});

test('Ultimate financial migration rolls back schema and data together when historical precision is invalid', () => {
 let db;
 assert.throws(()=>migrations((database,name)=>{
  if(name!=='20261102130000_financial_integrity')return;
  db=database;
  db.exec(`INSERT INTO User(id,email,passwordHash,fullName,referralCode) VALUES ('u','u@example.test','hash','User','u');
   INSERT INTO "Transaction"(id,userId,amount) VALUES ('bad','u',1.001)`);
 }),/two decimal/);
 try {
  db.exec('ROLLBACK');
  assert.equal(db.prepare('SELECT amount FROM "Transaction"').get().amount,1.001);
  assert.ok(!db.prepare('PRAGMA table_info("Transaction")').all().some(column=>column.name==='amountMinor'));
  assert.equal(db.prepare("SELECT count(*) AS count FROM sqlite_master WHERE type='trigger'").get().count,0);
 } finally {db.close();}
});

test('Ultimate alignment upgrades populated location, health and custom records without data loss', () => {
 const db = migrations((database, name) => {
  if (name !== '20261102120000_schema_alignment') return;
  database.exec(`INSERT INTO User(id,email,passwordHash,fullName,referralCode,updatedAt)
   VALUES ('owner','owner@example.test','hash','Owner','owner',CURRENT_TIMESTAMP);
   INSERT INTO location_points(id,userId,latitude,longitude,accuracyM,source,capturedAt)
   VALUES ('point','owner',12.9,77.6,5,'browser','2026-10-01 12:30:00');
   INSERT INTO health_profiles(id,userId,data,createdAt,updatedAt)
   VALUES ('health','owner','{"marker":"health"}','2026-10-01 12:30:00','2026-10-02 12:30:00');
   INSERT INTO custom_tables(id,userId,name,"schema",rows,createdAt,updatedAt)
   VALUES ('custom','owner','Custom','["field"]','[{"field":1}]','2026-10-01 12:30:00','2026-10-02 12:30:00');`);
 });
 try {
  const row = db.prepare('SELECT * FROM location_points').get();
  assert.equal(row.id, 'point');
  assert.equal(row.latitude, 12.9);
  assert.equal(row.capturedAt, '2026-10-01 12:30:00');
  assert.equal(row.createdAt, row.capturedAt);
  assert.equal(row.updatedAt, row.capturedAt);
  const health = db.prepare('SELECT data,createdAt,updatedAt FROM health_profiles').get();
  assert.deepEqual({...health}, {data:'{"marker":"health"}',createdAt:'2026-10-01 12:30:00',updatedAt:'2026-10-02 12:30:00'});
  const custom = db.prepare('SELECT name,"schema",rows,createdAt,updatedAt FROM custom_tables').get();
  assert.deepEqual({...custom}, {name:'Custom',schema:'["field"]',rows:'[{"field":1}]',createdAt:'2026-10-01 12:30:00',updatedAt:'2026-10-02 12:30:00'});
  assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  db.exec("DELETE FROM User WHERE id='owner'");
  assert.equal(db.prepare('SELECT count(*) AS count FROM location_points').get().count, 0);
 } finally { db.close(); }
});
test('money mirrors preserve cents and reject excess precision; goal ownership cannot diverge', () => {
 const db=migrations();
 db.exec(`INSERT INTO User(id,email,passwordHash,fullName,referralCode,updatedAt) VALUES ('a','a@example.test','hash','A','a',CURRENT_TIMESTAMP),('b','b@example.test','hash','B','b',CURRENT_TIMESTAMP);
 INSERT INTO "Transaction"(id,userId,amount) VALUES ('t','a',0.29);
 INSERT INTO Goal(id,userId) VALUES ('g','a');`);
 assert.equal(db.prepare('SELECT amountMinor FROM "Transaction"').get().amountMinor,29);
 assert.throws(()=>db.exec(`UPDATE "Transaction" SET amount=1.001 WHERE id='t'`),/two decimal/);
 assert.throws(()=>db.exec(`INSERT INTO GoalProgressLog(id,userId,goalId) VALUES ('p','b','g')`),/owner mismatch/);
 db.exec(`INSERT INTO GoalProgressLog(id,userId,goalId) VALUES ('p','a','g')`);
 assert.throws(()=>db.exec(`UPDATE Goal SET userId='b' WHERE id='g'`),/owner mismatch/);
 db.close();
});
test('mobile schema initializes and upserts one overall budget; exact cent aggregation', () => {
 const db=new DatabaseSync(':memory:'); db.exec('PRAGMA foreign_keys=ON');
 db.exec(read('FinSync/Expense Tracker - Mobile/expense-tracker-mobile/src/db/schema.ts').match(/CREATE_TABLES_SQL = `([\s\S]*?)`/)[1]);
 const upsert=db.prepare(`INSERT INTO budgets(month,category_id,amount) VALUES ('2026-11',NULL,?) ON CONFLICT(month,COALESCE(category_id,0)) DO UPDATE SET amount=excluded.amount`);
 upsert.run(10); upsert.run(20);
 assert.equal(db.prepare('SELECT count(*) AS n FROM budgets').get().n,1);
 assert.throws(()=>db.exec(`INSERT INTO expenses(amount,date) VALUES (1.001,'2026-11-01')`),/two decimal/);
 db.exec(`INSERT INTO expenses(amount,date) VALUES (0.1,'2026-11-01'),(0.2,'2026-11-01')`);
 assert.equal(db.prepare('SELECT SUM(amount_minor)/100.0 AS total FROM expenses').get().total,0.3);
 db.close();
});
test('mobile existing decimal records can gain exact mirrors without losing rows', () => {
 const db=new DatabaseSync(':memory:');
 const sql=read('FinSync/Expense Tracker - Mobile/expense-tracker-mobile/src/db/schema.ts').match(/CREATE_TABLES_SQL = `([\s\S]*?)`/)[1];
 db.exec(sql.replace(/^\s*\w+_minor INTEGER,\r?\n/gm,'').replace(/\s*CREATE TRIGGER[\s\S]*?END;/g,''));
 db.exec("INSERT INTO expenses(amount,date) VALUES (.29,'2026-11-01')");
 db.exec('BEGIN');db.exec(sql);
 const tables={expenses:['amount'],budgets:['amount'],recurring_templates:['amount','installment_amt','min_amount','max_amount'],recurring_entries:['actual_amount']};
 for(const [table,fields] of Object.entries(tables)) {
  for(const field of fields)db.exec(`ALTER TABLE ${table} ADD COLUMN ${field}_minor INTEGER`);
  db.exec(`UPDATE ${table} SET ${fields[0]}=${fields[0]}`);
 }
 db.exec('COMMIT');
 assert.equal(db.prepare('SELECT amount_minor FROM expenses').get().amount_minor,29);
 db.close();
});
