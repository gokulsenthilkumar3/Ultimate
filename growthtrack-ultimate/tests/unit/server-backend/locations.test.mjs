import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocationHandlers } from '../../../server/domains/locations.js';
import { isolatedFixture, request, call } from './fixture.mjs';

test('location deletion checks ownership and audits only count metadata', async t => {
  const { prisma } = await isolatedFixture(t);
  const audits = [];
  const handlers = createLocationHandlers({ prisma, auditCrud: event => audits.push(event) });
  const row = await call(handlers.create, request({ latitude: 12.34, longitude: 56.78 }));
  assert.equal(row.statusCode, 200);
  assert.equal((await call(handlers.delete, request({}, 'owner-b', row.body.id))).statusCode, 404);
  assert.equal((await call(handlers.delete, request({}, 'owner-a', row.body.id))).body.count, 1);
  assert.ok(!/12\.34|56\.78|latitude|longitude/.test(JSON.stringify(audits.map(({ details, item_id, action }) => ({ details, item_id, action })))));
});

test('clear locations requires explicit confirmation and deletes only the owner records', async t => {
  const { prisma } = await isolatedFixture(t);
  const handlers = createLocationHandlers({ prisma });
  for (const userId of ['owner-a', 'owner-b']) await call(handlers.create, request({ latitude: 1, longitude: 2 }, userId));
  assert.equal((await call(handlers.deleteAll, request())).statusCode, 400);
  assert.equal((await call(handlers.deleteAll, request({ confirm: 'true' }))).statusCode, 400);
  assert.equal(await prisma.locationPoint.count(), 2);
  assert.equal((await call(handlers.deleteAll, request({ confirm: true }))).body.count, 1);
  assert.equal(await prisma.locationPoint.count({ where: { userId: 'owner-b' } }), 1);
});

test('invalid location values are rejected and list failures do not masquerade as empty history', async () => {
  const handlers = createLocationHandlers({ prisma: { locationPoint: { findMany: () => { throw new Error('private failure'); } } } });
  assert.equal((await call(handlers.create, request({ latitude: null, longitude: 0 }))).statusCode, 400);
  assert.equal((await call(handlers.create, request({ latitude: 200, longitude: 0 }))).statusCode, 400);
  const res = await call(handlers.list, request());
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.code, 'INTERNAL_ERROR');
  assert.ok(!JSON.stringify(res.body).includes('private failure'));
});
