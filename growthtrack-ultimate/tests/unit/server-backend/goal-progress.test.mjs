import test from 'node:test';
import assert from 'node:assert/strict';
import GoalProgressController from '../../../server/controllers/GoalProgressController.js';
import { migratedFixture, request, call } from './fixture.mjs';

async function fixture(t) {
  const { prisma } = await migratedFixture(t);
  const goal = await prisma.goal.create({ data: { id: 'goal', userId: 'owner-a', title: 'Read', status: 'active', current_value: 2, target_value: 10 } });
  return { prisma, goal, controller: new GoalProgressController(prisma) };
}
const payload = { id: 'progress', goalId: 'goal', value: 10, date: '2026-11-03', note: 'Synthetic progress' };

test('progress and goal completion commit together; the same id safely replays after a lost response', async t => {
  const { prisma, goal, controller } = await fixture(t);
  const input = { ...payload, expectedUpdatedAt: goal.updatedAt.toISOString() };
  const first = await call(controller.create.bind(controller), request(input));
  assert.equal(first.statusCode, 200); assert.equal(first.body.goal.current_value, 10); assert.equal(first.body.goal.status, 'completed');
  const replay = await call(controller.create.bind(controller), request(input));
  assert.equal(replay.statusCode, 200); assert.equal(replay.body.id, first.body.id);
  assert.equal(await prisma.goalProgressLog.count(), 1);
  const reused = await call(controller.create.bind(controller), request({ ...input, value: 11 }));
  assert.equal(reused.statusCode, 409); assert.equal((await prisma.goal.findUnique({ where: { id: goal.id } })).current_value, 10);
});

test('progress reads filter the selected goal and writes reject foreign owners, stale versions and invalid dates', async t => {
  const { prisma, controller } = await fixture(t);
  await prisma.goal.create({ data: { id: 'other', userId: 'owner-a' } });
  await prisma.goalProgressLog.create({ data: { id: 'other-log', goalId: 'other', userId: 'owner-a', value: 1 } });
  assert.equal((await call(controller.create.bind(controller), request(payload, 'owner-b'))).statusCode, 404);
  assert.equal((await call(controller.create.bind(controller), request({ ...payload, expectedUpdatedAt: new Date(0).toISOString() }))).statusCode, 409);
  assert.equal((await call(controller.create.bind(controller), request({ ...payload, date: '2026-02-30' }))).statusCode, 400);
  assert.equal((await call(controller.create.bind(controller), request({ ...payload, goalId: undefined, goal_id: 'goal' }))).statusCode, 200);
  const req = request(); req.query = { goal_id: 'goal' };
  const list = await call(controller.getAll.bind(controller), req);
  assert.deepEqual(list.body.map(row => row.id), ['progress']);
  const foreign = request({}, 'owner-b'); foreign.query = { goalId: 'goal' };
  assert.deepEqual((await call(controller.getAll.bind(controller), foreign)).body, []);
});

test('late progress insertion failure rolls back the goal value and status', async t => {
  const { prisma, controller } = await fixture(t);
  await prisma.$executeRawUnsafe("CREATE TRIGGER fail_progress BEFORE INSERT ON GoalProgressLog BEGIN SELECT RAISE(ABORT,'injected progress failure'); END");
  const failed = await call(controller.create.bind(controller), request(payload));
  assert.equal(failed.statusCode, 500);
  const goal = await prisma.goal.findUnique({ where: { id: 'goal' } });
  assert.equal(goal.current_value, 2); assert.equal(goal.status, 'active'); assert.equal(await prisma.goalProgressLog.count(), 0);
});
