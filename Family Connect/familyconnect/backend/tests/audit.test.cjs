process.env.REDIS_DISABLED = '1';
const test = require('node:test');
const assert = require('node:assert/strict');
const { auditData, recordAudit, changedFields } = require('../dist/services/audit');
const { createAuditReader, auditQuery } = require('../dist/controllers/audit.controller');

const response = () => ({ code: 200, headers: {}, status(code) { this.code = code; return this; }, set(name, value) { this.headers[name] = value; return this; }, json(body) { this.body = body; return this; } });
const entry = (details = {}, extra = {}) => ({ treeId: 'tree-a', actorId: 'actor', action: 'member.update', entity: 'member', entityId: 'person-a', details, ...extra });

test('trail entries accept only metadata and reject anything that could carry private text', () => {
  assert.deepEqual(auditData(entry({ fields: ['bio', 'name'], count: 3, kind: 'year', ok: true, none: null })).details, { fields: ['bio', 'name'], count: 3, kind: 'year', ok: true, none: null });
  assert.equal(auditData({ actorId: 'a', action: 'tree.create', entity: 'tree' }).treeId, null);
  const bad = [
    entry({ note: 'x'.repeat(101) }), entry({ nested: { a: 1 } }), entry({ list: ['x'.repeat(61)] }), entry({ list: Array(51).fill('a') }), entry({ list: [1] }), entry({ n: Number.NaN }),
    entry({ 'bad key': 1 }), entry({ ['k'.repeat(41)]: 1 }), entry(Object.fromEntries(Array.from({ length: 21 }, (_, index) => [`k${index}`, 1]))), entry({ text: 'line\nbreak' }),
    entry({}, { action: 'Member Update' }), entry({}, { actorId: 'has space' }), entry({}, { treeId: '../x' }), entry({}, { entityId: 'x'.repeat(201) }),
  ];
  for (const value of bad) assert.throws(() => auditData(value), /Invalid audit entry/, JSON.stringify(value).slice(0, 80));
  assert.deepEqual(changedFields({ name: 1, bio: 2, birthDate: 3 }), ['bio', 'birthDate', 'name']);
});

test('recording uses the caller transaction client and stores the validated row', async () => {
  const rows = []; const tx = { auditLog: { create: async ({ data }) => { rows.push(data); return data; } } };
  await recordAudit(tx, entry({ fields: ['name'] })); assert.equal(rows.length, 1); assert.equal(rows[0].action, 'member.update');
  await assert.rejects(async () => recordAudit(tx, entry({ note: 'x'.repeat(200) })), /Invalid audit entry/); assert.equal(rows.length, 1, 'an invalid entry writes nothing');
});

function reader(role) {
  const calls = [];
  const tx = {
    accessControl: { findUnique: async ({ where }) => (where.treeId_userId.userId === 'admin' ? { role: role || 'admin' } : null) },
    auditLog: { findMany: async input => { calls.push(input); return [{ id: 'a1', actorId: 'actor', action: 'member.update', entity: 'member', entityId: 'p', details: { fields: ['name'] }, createdAt: new Date('2026-11-07T00:00:00Z') }]; }, count: async () => 120 },
  };
  return { calls, handler: createAuditReader({ $transaction: async callback => callback(tx) }) };
}
const request = (user = 'admin', id = 'tree-a', query = {}) => ({ user: user ? { id: user } : undefined, params: { id }, query });

test('only tree admins read the trail, newest first, in bounded pages', async () => {
  const { calls, handler } = reader(); const res = response(); await handler(request('admin', 'tree-a', { page: '2' }), res);
  assert.equal(res.code, 200); assert.equal(res.headers['Cache-Control'], 'no-store'); assert.deepEqual([res.body.total, res.body.page, res.body.limit, res.body.rows.length], [120, 2, 50, 1]);
  assert.deepEqual([calls[0].skip, calls[0].take, calls[0].where], [100, 50, { treeId: 'tree-a' }]); assert.deepEqual(calls[0].orderBy, [{ createdAt: 'desc' }, { id: 'desc' }]);
  assert.deepEqual(Object.keys(calls[0].select).sort(), ['actorId', 'action', 'createdAt', 'details', 'entity', 'entityId', 'id'].sort());
  for (const role of ['editor', 'family_head', 'viewer']) { const denied = response(); await reader(role).handler(request(), denied); assert.equal(denied.code, 403, role); }
  const stranger = response(); await handler(request('stranger'), stranger); assert.equal(stranger.code, 403);
  const anonymous = response(); await handler(request(null), anonymous); assert.equal(anonymous.code, 401);
  for (const [id, query] of [['../x', {}], ['tree-a', { page: '-1' }], ['tree-a', { page: 'x' }], ['tree-a', { page: '1', extra: '1' }]]) { const bad = response(); await handler(request('admin', id, query), bad); assert.equal(bad.code, 400, id + JSON.stringify(query)); }
  assert.equal(auditQuery.safeParse({ page: '99999' }).success, true); assert.equal(auditQuery.safeParse({ page: '100000' }).success, false);
});
