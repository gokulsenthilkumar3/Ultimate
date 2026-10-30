const test = require('node:test');
const assert = require('node:assert/strict');
const { createTreePolicy } = require('../dist/services/treeAccess.js');
const { memberFields } = require('../dist/controllers/members.controller.js');
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } });

test('Family reads require membership; writes additionally require the live editor role', async () => {
  let role = 'viewer', calls = 0;
  const policy = createTreePolicy({ accessControl: { findFirst: async ({ where }) => { calls += 1; return where.userId === 'story-user' && where.treeId === 'story-tree' ? { role } : null; } } });
  const req = { user: { id: 'story-user' } };
  assert.equal(await policy.authorizeTree(req, response(), 'story-tree'), true);
  const viewer = response(); assert.equal(await policy.authorizeTree(req, viewer, 'story-tree', true), false); assert.equal(viewer.statusCode, 403);
  role = 'editor'; assert.equal(await policy.authorizeTree(req, response(), 'story-tree', true), true);
  role = 'viewer'; assert.equal(await policy.authorizeTree(req, response(), 'story-tree', true), false);
  assert.equal(calls, 4, 'permissions are not reused from a data cache');
  assert.equal(await policy.authorizeTree(req, response(), 'another-tree'), false);
  const anonymous = response(); assert.equal(await policy.authorizeTree({}, anonymous, 'story-tree'), false); assert.equal(anonymous.statusCode, 401);
});
test('relationships, events and uploads cannot associate members from another family tree', async () => {
  const policy = createTreePolicy({ member: { count: async ({ where }) => where.id.in.filter(id => ['person-a', 'person-b'].includes(id) && where.treeId === 'story-tree').length } });
  assert.equal(await policy.membersBelongToTree('story-tree', ['person-a', 'person-b']), true);
  assert.equal(await policy.membersBelongToTree('story-tree', ['person-a', 'private-person']), false);
  assert.equal(await policy.membersBelongToTree('story-tree', [null, '']), true);
  assert.equal(await policy.membersBelongToTree('story-tree', [{ id: 'person-a' }]), false);
});
test('profile edits reject identity/ownership changes and invalid dates', () => {
  const update = memberFields.partial().strict();
  assert.equal(update.safeParse({ name: 'Story User', bio: 'Fictional biography.' }).success, true);
  for (const field of ['id', 'treeId', 'createdById', 'tree', 'createdBy']) assert.equal(update.safeParse({ [field]: 'another-owner' }).success, false);
  assert.equal(update.safeParse({ birthDate: '2026-99-99' }).success, false);
});
