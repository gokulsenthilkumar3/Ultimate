const test = require('node:test');
const assert = require('node:assert/strict');
const { createRecordMutationHandlers } = require('../dist/controllers/recordMutations.controller');
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, set() {} });

function fixture(role = 'editor') {
  const changes = [], audit = [], files = [], audits = [];
  const records = {
    member: { id: 'person-a', treeId: 'tree-a' },
    event: { id: 'event-a', treeId: 'tree-a', title: 'Fictional milestone' },
    relationship: { id: 'relation-a', treeId: 'tree-a', member1Id: 'person-a', member2Id: 'person-b', type: 'parent' },
    document: { id: 'document-a', treeId: 'tree-a', fileUrl: '/uploads/fixture.txt' },
  };
  const tx = { accessControl: { findUnique: async ({ where }) => where.treeId_userId.userId === 'allowed' ? { role } : null } };
  for (const [kind, row] of Object.entries(records)) tx[kind] = {
    findUnique: async () => row,
    findFirst: async () => null,
    findMany: async () => [],
    count: async ({ where }) => kind === 'member' ? where.id.in.filter(value => ['person-a','person-b'].includes(value)).length : 0,
    update: async input => { changes.push([kind, 'update', input]); return { ...row, ...input.data }; },
    delete: async input => { changes.push([kind, 'delete', input]); return row; },
    updateMany: async input => { changes.push([kind, 'updateMany', input]); return { count: 1 }; },
    deleteMany: async input => { changes.push([kind, 'deleteMany', input]); return { count: 1 }; },
  };
  tx.auditLog = { create: async input => { audits.push(input.data); return input.data; } };
  tx.familyTree = { updateMany: async input => { changes.push(['tree', 'updateMany', input]); return { count: 1 }; } };
  const db = { $transaction: async callback => callback(tx) };
  return { tx, changes, audit, audits, files, handlers: createRecordMutationHandlers(db, async file => files.push(file), event => audit.push(event)) };
}
const request = (id, body, actor = 'allowed') => ({ user: { id: actor }, params: { id }, body });

for (const role of ['viewer','editor','family_head','admin']) {
  test(`${role}: event/relationship edits respect live tree permissions`, async () => {
    for (const [method, recordId, body] of [['updateEvent','event-a',{title:'Updated milestone'}], ['updateRelationship','relation-a',{customLabel:'Updated connection'}]]) {
      const f = fixture(role), res = response();
      await f.handlers[method](request(recordId, body), res);
      assert.equal(res.code, role === 'viewer' ? 403 : 200);
      assert.equal(f.changes.length, role === 'viewer' ? 0 : 1);
      assert.equal(f.audit.length, role === 'viewer' ? 0 : 1);
    }
  });
  test(`${role}: permanent deletion requires admin for every record kind`, async () => {
    for (const [method, recordId] of [['deleteMember','person-a'],['deleteRelationship','relation-a'],['deleteEvent','event-a'],['deleteDocument','document-a']]) {
      const f = fixture(role), res = response();
      await f.handlers[method](request(recordId, {confirm:recordId}), res);
      assert.equal(res.code, role === 'admin' ? 200 : 403);
      assert.equal(f.changes.length > 0, role === 'admin');
    }
  });
}

test('other users, ownership overrides, invalid dates, self-links and cross-tree people are rejected', async () => {
  for (const [method, recordId, body, actor, expected] of [
    ['updateEvent','event-a',{title:'Rejected'},'outsider',403],
    ['updateEvent','event-a',{treeId:'another-tree'},'allowed',400],
    ['updateEvent','event-a',{date:'2026-99-99'},'allowed',400],
    ['updateEvent','event-a',{memberId:'private-person'},'allowed',400],
    ['updateRelationship','relation-a',{member2Id:'person-a'},'allowed',400],
    ['updateRelationship','relation-a',{member2Id:'private-person'},'allowed',400],
    ['updateRelationship','relation-a',{createdById:'outsider'},'allowed',400],
  ]) {
    const f = fixture(), res = response(); await f.handlers[method](request(recordId,body,actor),res);
    assert.equal(res.code, expected); assert.equal(f.changes.length,0); assert.equal(f.audit.length,0);
  }
});

test('deletion requires explicit ID confirmation and detaches a person without deleting their files/milestones', async () => {
  const f = fixture('admin'), denied = response(); await f.handlers.deleteMember(request('person-a',{}),denied);
  assert.equal(denied.code,400); assert.equal(f.changes.length,0);
  const res=response(); await f.handlers.deleteMember(request('person-a',{confirm:'person-a'}),res);
  assert.deepEqual(f.changes.map(([kind,action])=>kind+':'+action),['tree:updateMany','relationship:deleteMany','event:updateMany','document:updateMany','member:delete']);
  assert.equal(f.changes[2][2].data.memberId,null); assert.equal(f.changes[3][2].data.memberId,null);
  assert.equal(f.audit[0].actorId,'allowed'); assert.equal(JSON.stringify(f.audit).includes('Fictional milestone'),false);
});

test('document cleanup failure is reported honestly after the metadata transaction commits', async () => {
  const f=fixture('admin'); const db={$transaction:async callback=>callback(f.tx)};
  const handlers=createRecordMutationHandlers(db,async()=>{throw Error('storage unavailable');},()=>{}),res=response();
  await handlers.deleteDocument(request('document-a',{confirm:'document-a'}),res);
  assert.equal(res.code,200); assert.equal(res.body.storageCleanupPending,true);
  assert.ok(f.changes.some(([kind,action])=>kind==='document'&&action==='delete'));
});

test('shared storage objects are retained and serialization conflicts do not trigger retries', async () => {
  const f=fixture('admin'); f.tx.document.count=async()=>1;
  await f.handlers.deleteDocument(request('document-a',{confirm:'document-a'}),response());
  assert.equal(f.files.length,0);
  let attempts=0; const handlers=createRecordMutationHandlers({$transaction:async()=>{attempts++;throw {code:'P2034'};}},async()=>{},()=>{}),res=response();
  await handlers.deleteEvent(request('event-a',{confirm:'event-a'}),res);
  assert.equal(res.code,409);assert.equal(attempts,1);
});

test('updates and deletions write one metadata-only trail entry in the same transaction', async () => {
  const f = fixture('admin'), cases = [['updateEvent', 'event-a', { title: 'Private milestone title' }, 'event.update', { fields: ['title'] }], ['updateRelationship', 'relation-a', { customLabel: 'Private label' }, 'relationship.update', { fields: ['customLabel'] }], ['deleteMember', 'person-a', { confirm: 'person-a' }, 'member.delete', {}], ['deleteDocument', 'document-a', { confirm: 'document-a' }, 'document.delete', { fileRemoved: true }]];
  for (const [method, recordId, body, action, details] of cases) {
    const before = f.audits.length, res = response();
    await f.handlers[method](request(recordId, body), res);
    assert.equal(res.code, 200, method); assert.equal(f.audits.length, before + 1, method);
    const entry = f.audits.at(-1);
    assert.deepEqual([entry.action, entry.treeId, entry.actorId, entry.entityId, entry.details], [action, 'tree-a', 'allowed', recordId, details], method);
  }
  assert.equal(/Private|fixture\.txt/.test(JSON.stringify(f.audits)), false, 'values and file names never enter the trail');
  const viewer = fixture('viewer'), denied = response(); await viewer.handlers.updateEvent(request('event-a', { title: 'x' }), denied);
  assert.equal(denied.code, 403); assert.equal(viewer.audits.length, 0, 'a refused change is not recorded as a change');
});
