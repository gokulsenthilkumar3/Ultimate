import test from 'node:test';
import assert from 'node:assert/strict';
import BaseController from '../../../server/controllers/BaseController.js';
import { appleHealthSetupRequired, metricToClient, setupRequired } from '../../../server/domains/providers.js';
import { mutationInput, redactedAuditFields } from '../../../server/domains/mutations.js';
import { createCapabilitiesHandler } from '../../../server/domains/capabilities.js';
import { createEventLogger } from '../../../server/eventLogger.js';
import { publicSettingsWhere } from '../../../server/domains/settingsVisibility.js';
import { isolatedFixture, request, call } from './fixture.mjs';

test('Apple sync is setup required and legacy readings remain intact and unverified', async () => {
  const res = await call(appleHealthSetupRequired, request());
  assert.equal(res.statusCode, 501);
  assert.equal(res.body.status, 'setup_required');
  const reading = { id: 'old', value: 78.6, source: 'Apple Health', data: '{"unit":"kg","provenance":"verified"}' };
  assert.equal(metricToClient(reading).provenance, 'unverified');
  assert.equal(metricToClient(reading).value, 78.6);
  assert.equal(reading.data, '{"unit":"kg","provenance":"verified"}');
  assert.equal((await call(setupRequired('bank', 'Setup required.'), request())).statusCode, 501);
});

test('BaseController rejects stale updates and deletion, returns a new version', async t => {
  const { prisma } = await isolatedFixture(t);
  const row = await prisma.transaction.create({ data: { userId: 'owner-a', amount: 10, type: 'Income', date: '2026-09-20' } });
  const audits = [];
  const controller = new BaseController(prisma.transaction, 'finance', null, null, event => audits.push(event));
  const updated = await call(controller.update.bind(controller), request({ amount: 20, expectedUpdatedAt: row.updatedAt.toISOString() }, 'owner-a', row.id));
  assert.equal(updated.statusCode, 200);
  assert.ok(new Date(updated.body.updatedAt) > row.updatedAt);
  const stale = request({ amount: 30, expectedUpdatedAt: row.updatedAt.toISOString() }, 'owner-a', row.id);
  assert.equal((await call(controller.update.bind(controller), stale)).statusCode, 409);
  assert.equal((await call(controller.delete.bind(controller), stale)).statusCode, 409);
  assert.equal((await call(controller.update.bind(controller), request({ amount: 100 }, 'owner-b', row.id))).statusCode, 404);
  assert.equal((await prisma.transaction.findUnique({ where: { id: row.id } })).amount, 20);
  assert.equal(audits.length, 1);
  assert.deepEqual(audits[0].details, { fields: ['amount'], redactedFields: 0 });
});

test('atomic version condition catches a race after the initial read', async () => {
  const row = { id: 'r', userId: 'owner-a', amount: 10, updatedAt: new Date('2026-09-20') };
  let updateWhere;
  const model = { findFirst: async () => row, updateMany: async args => { updateWhere = args.where; return { count: 0 }; } };
  const controller = new BaseController(model, 'finance');
  assert.equal((await call(controller.update.bind(controller), request({ amount: 20 }, 'owner-a', 'r'))).statusCode, 409);
  assert.equal(updateWhere.updatedAt, row.updatedAt);
  assert.equal(updateWhere.userId, 'owner-a');
});

test('mutation input cannot write audit ownership/version fields and audits redact arbitrary private keys', () => {
  assert.deepEqual(mutationInput({ title: 'hello', userId: 'other', createdBy: 'other', updatedAt: 'now', expectedUpdatedAt: 'before' }), { title: 'hello' });
  assert.deepEqual(redactedAuditFields({ title: 'private title', secretToken: 'secret', 'private@example.test': 'private' }), { fields: ['title'], redactedFields: 2 });
});

test('capabilities use the real tier/configuration and expose no credentials', async t => {
  const { prisma } = await isolatedFixture(t);
  let configured = false;
  const handler = createCapabilitiesHandler({ prisma, version: '2.0.1', checkoutAvailable: () => configured });
  const before = await call(handler, request());
  assert.deepEqual(before.body.billing, { checkoutAvailable: false, tier: 'free' });
  assert.ok(before.body.connections.every(connection => connection.status === 'setup-required'));
  assert.ok(!/secret|ciphertext|STRIPE_|token/i.test(JSON.stringify(before.body)));
  configured = true;
  assert.equal((await call(handler, request())).body.billing.checkoutAvailable, true);
  assert.equal((await call(handler, request({}, 'owner-b'))).body.billing.tier, null);
});

test('redacted CRUD events contain no invented actor or request identity', async () => {
  let logged;
  const logger = createEventLogger({ prisma: { auditLog: { create: async input => { logged = input.data; return { id: 'event' }; } } }, logToFile: () => {} });
  await logger.write({ category: 'audit', user_id: 'owner-a', details: { fields: ['amount'] }, metadata: { privacy: 'redacted' } }, { requestId: 'request' });
  assert.equal(logged.actor_name, null);
  assert.equal(logged.actor_email, null);
  assert.equal(logged.actor_ip, null);
  assert.equal(logged.user_agent, null);
});

test('shared settings surfaces use an explicit allowlist without private notification state', () => {
  const keys = publicSettingsWhere().key.in;
  assert.ok(keys.includes('navigation'));
  assert.ok(keys.includes('weatherUrl'));
  assert.ok(keys.every(key => !key.startsWith('private:')));
  assert.ok(!keys.includes('private:notifications:v1:owner-a'));
});
