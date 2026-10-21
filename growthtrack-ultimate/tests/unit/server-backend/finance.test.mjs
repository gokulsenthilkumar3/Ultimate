import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createFinanceHandlers, parseFinanceCsv, financeExportWhere, csvCell } from '../../../server/domains/finance.js';
import { isolatedFixture, request, call } from './fixture.mjs';

const statement = 'amount,type,date,category,method,note\n12.50,expense,2026-09-20,Food,Card,"Lunch, with friend\nsecond line"';

test('CSV parses BOM, escaped quotes, commas and quoted newlines', () => {
  const rows = parseFinanceCsv(`\uFEFF${statement}\n20,investment,2026-09-21,Stocks,Transfer,"A ""quoted"" note"`);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].transaction.note, 'Lunch, with friend\nsecond line');
  assert.equal(rows[0].transaction.type, 'Expense');
  assert.equal(rows[1].transaction.type, 'Investment');
  assert.equal(rows[1].transaction.note, 'A "quoted" note');
});

test('CSV validates decimal amount, dates, types, columns and headers', () => {
  const rows = parseFinanceCsv('amount,type,date\n,expense,2026-09-20\nNaN,income,2026-09-20\n0,expense,2026-09-20\n10,unknown,2026-02-30\n1,expense,2026-09-20,extra');
  assert.ok(rows.every(row => row.status === 'invalid' && row.errors.length));
  assert.throws(() => parseFinanceCsv('amount,amount,date\n1,2,2026-09-20'), { code: 'CSV_HEADERS' });
  assert.throws(() => parseFinanceCsv('amount,type,date\n1,expense,"unterminated'), { code: 'CSV_SYNTAX' });
  assert.throws(() => parseFinanceCsv('x'.repeat(2 * 1024 * 1024 + 1)), { code: 'CSV_TOO_LARGE' });
});

test('preview makes no writes, flags invalid rows and prevents commit', async t => {
  const { prisma } = await isolatedFixture(t);
  const handlers = createFinanceHandlers({ prisma });
  const preview = await call(handlers.preview, request({ content: 'amount,type,date\n10,income,2026-09-20\n0,expense,2026-09-21' }));
  assert.equal(preview.body.canCommit, false);
  assert.equal(preview.body.previewId, null);
  assert.equal(preview.body.summary.invalid, 1);
  assert.equal(await prisma.transaction.count(), 0);
  assert.equal((await call(handlers.commit, request({ previewId: preview.body.previewId }))).statusCode, 410);
});

test('commit deduplicates existing and repeated rows, is owner scoped and replay safe', async t => {
  const { prisma } = await isolatedFixture(t);
  await prisma.transaction.create({ data: { userId: 'owner-a', amount: 10, type: 'Income', date: '2026-09-20' } });
  const handlers = createFinanceHandlers({ prisma });
  const content = 'amount,type,date\n10,income,2026-09-20\n15,expense,2026-09-21\n15,Expense,2026-09-21';
  const preview = await call(handlers.preview, request({ content }));
  assert.deepEqual(preview.body.summary, { total: 3, valid: 3, invalid: 0, duplicates: 2, importable: 1 });
  assert.equal((await call(handlers.commit, request({ previewId: preview.body.previewId }, 'owner-b'))).statusCode, 410);
  const results = await Promise.all([call(handlers.commit, request({ previewId: preview.body.previewId })), call(handlers.commit, request({ previewId: preview.body.previewId }))]);
  assert.equal(results[0].body.imported, 1);
  assert.equal(results[1].body.replayed, true);
  assert.equal(await prisma.transaction.count(), 2);
  const fresh = createFinanceHandlers({ prisma });
  const repeated = await call(fresh.legacyImport, request({ content }));
  assert.equal(repeated.body.imported, 0);
  assert.equal(repeated.body.duplicates, 3);
  assert.equal(await prisma.transaction.count(), 2);
});

test('commit rechecks duplicates created after preview and preserves edited import identity', async t => {
  const { prisma } = await isolatedFixture(t);
  const handlers = createFinanceHandlers({ prisma });
  const content = 'amount,type,date\n10,income,2026-09-20';
  const preview = await call(handlers.preview, request({ content }));
  await prisma.transaction.create({ data: { userId: 'owner-a', amount: 10, type: 'Income', date: '2026-09-20' } });
  assert.equal((await call(handlers.commit, request({ previewId: preview.body.previewId }))).body.imported, 0);
  const imported = await call(handlers.legacyImport, request({ content: 'amount,type,date\n30,expense,2026-09-22' }));
  assert.equal(imported.body.imported, 1);
  const row = await prisma.transaction.findFirst({ where: { amount: 30 } });
  await prisma.transaction.update({ where: { id: row.id }, data: { note: 'Edited later' } });
  assert.equal((await call(createFinanceHandlers({ prisma }).legacyImport, request({ content: 'amount,type,date\n30,expense,2026-09-22' }))).body.imported, 0);
});

test('partial failure rolls the entire CSV transaction back', async t => {
  const { prisma } = await isolatedFixture(t);
  const injected = { transaction: prisma.transaction, $transaction: work => prisma.$transaction(async tx => {
    let creates = 0;
    return work({ transaction: {
      findMany: args => tx.transaction.findMany(args), findFirst: args => tx.transaction.findFirst(args),
      create: args => { if (++creates === 2) throw new Error('Injected failure'); return tx.transaction.create(args); },
    } });
  }) };
  const result = await call(createFinanceHandlers({ prisma: injected }).legacyImport, request({ content: 'amount,type,date\n10,income,2026-09-20\n20,expense,2026-09-21' }));
  assert.equal(result.statusCode, 500);
  assert.equal(await prisma.transaction.count(), 0);
});

test('previews expire without writes', async t => {
  const { prisma } = await isolatedFixture(t);
  let clock = Date.now();
  const handlers = createFinanceHandlers({ prisma, now: () => clock });
  const preview = await call(handlers.preview, request({ content: statement }));
  clock += 15 * 60 * 1000 + 1;
  assert.equal((await call(handlers.commit, request({ previewId: preview.body.previewId }))).statusCode, 410);
  assert.equal(await prisma.transaction.count(), 0);
});

test('independent clients committing overlapping previews do not double import', async t => {
  const { prisma, url } = await isolatedFixture(t);
  const second = new PrismaClient({ adapter: new PrismaLibSql({ url }) });
  t.after(() => second.$disconnect());
  const errors = [];
  const observed = client => ({ transaction: client.transaction, async $transaction(work, options) {
    try { return await client.$transaction(work, options); }
    catch (error) { errors.push({ code: error.code, message: error.message, meta: error.meta }); throw error; }
  } });
  const firstHandlers = createFinanceHandlers({ prisma: observed(prisma) });
  const secondHandlers = createFinanceHandlers({ prisma: observed(second) });
  const content = 'amount,type,date\n21,income,2026-09-20';
  const [first, other] = await Promise.all([call(firstHandlers.preview, request({ content })), call(secondHandlers.preview, request({ content }))]);
  const results = await Promise.all([call(firstHandlers.commit, request({ previewId: first.body.previewId })), call(secondHandlers.commit, request({ previewId: other.body.previewId }))]);
  assert.ok(results.every(result => result.statusCode === 200), JSON.stringify({ results: results.map(result => result.body), errors }));
  assert.equal(results.reduce((sum, result) => sum + result.body.imported, 0), 1);
  assert.equal(await prisma.transaction.count(), 1);
});

test('filtered export stays owner scoped and neutralizes formula prefixes', async t => {
  const { prisma } = await isolatedFixture(t);
  const handlers = createFinanceHandlers({ prisma });
  for (const userId of ['owner-a', 'owner-b']) await prisma.transaction.create({ data: { userId, amount: 10, type: 'Income', date: '2026-09-20', category: 'Salary', method: 'Bank', note: ' =HYPERLINK("bad")' } });
  await prisma.transaction.create({ data: { userId: 'owner-a', amount: 20, type: 'Expense', date: '2026-09-21' } });
  const req = request();
  req.query = { from: '2026-09-20', to: '2026-09-20', type: 'income', category: 'Salary', method: 'Bank', search: 'HYPERLINK' };
  const res = await call(handlers.export, req);
  const rows = parse(res.body, { columns: true });
  assert.equal(rows.length, 1);
  assert.ok(rows[0].note.startsWith("'"));
  assert.equal(res.headers['content-disposition'], 'attachment; filename="growthtrack-finance.csv"');
  for (const cell of ['=A1', '+A1', '-A1', '@SUM(A1)', '\t=A1', '  =A1']) assert.ok(parse(csvCell(cell))[0][0].startsWith("'"));
  assert.throws(() => financeExportWhere('owner-a', { from: '2026-02-30' }), { code: 'INVALID_FILTER' });
  assert.throws(() => financeExportWhere('owner-a', { from: '2026-09-21', to: '2026-09-20' }), { code: 'INVALID_FILTER' });
});
