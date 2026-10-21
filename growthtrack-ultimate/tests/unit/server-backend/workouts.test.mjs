import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkoutHandlers, normalizeWorkoutCompletion } from '../../../server/domains/workouts.js';
import { isolatedFixture, request, call } from './fixture.mjs';

const id = '00000000-0000-4000-8000-000000000001';
const payload = () => ({ id, date: '2026-09-29', notes: 'Private notes', duration_minutes: 32, volume: 240,
  sets: [{ id: 'bench-1', exName: 'Bench press', setNum: 1, actualReps: 6, actualWeight: 40, done: true }] });

test('workout completion is atomic, acknowledged, owner scoped and replay safe', async t => {
  const { prisma } = await isolatedFixture(t);
  const audits = [];
  const handler = createWorkoutHandlers({ prisma, auditCrud: event => { audits.push(event); return Promise.resolve(); } }).complete;
  const first = await call(handler, request(payload()));
  assert.equal(first.statusCode, 200);
  assert.equal(first.body.id, id);
  assert.equal(first.body.replayed, false);
  assert.equal(first.body._sets.length, 1);
  assert.equal((await prisma.workoutExercise.count({ where: { sessionId: id } })), 1);
  const retry = await call(handler, request(payload()));
  assert.equal(retry.statusCode, 200);
  assert.equal(retry.body.replayed, true);
  assert.equal((await prisma.workoutExercise.count({ where: { sessionId: id } })), 1);
  assert.equal(audits.length, 1);
  assert.doesNotMatch(JSON.stringify(audits[0].details), /Private notes|Bench press/);
  assert.equal((await call(handler, request(payload(), 'owner-b'))).statusCode, 409);
  assert.equal((await call(handler, request({ ...payload(), duration_minutes: 33 }))).statusCode, 409);
});

test('invalid completed sets cannot create a partial workout', async t => {
  const { prisma } = await isolatedFixture(t);
  const handler = createWorkoutHandlers({ prisma }).complete;
  for (const bad of [
    { ...payload(), volume: 241 },
    { ...payload(), date: '2026-02-30' },
    { ...payload(), sets: [{ ...payload().sets[0], actualWeight: -1 }] },
  ]) assert.equal((await call(handler, request(bad))).statusCode, 400);
  assert.equal(await prisma.workoutSession.count(), 0);
  assert.equal(await prisma.workoutExercise.count(), 0);
  assert.equal(normalizeWorkoutCompletion(payload()).volume, 240);
});

test('database failure creating a set rolls back its parent session', async t => {
  const { prisma } = await isolatedFixture(t);
  await prisma.$executeRawUnsafe('CREATE TRIGGER fail_workout_insert BEFORE INSERT ON "WorkoutExercise" BEGIN SELECT RAISE(FAIL, "injected set failure"); END');
  const result = await call(createWorkoutHandlers({ prisma }).complete, request(payload()));
  assert.notEqual(result.statusCode, 200);
  assert.equal(await prisma.workoutSession.count(), 0);
  assert.equal(await prisma.workoutExercise.count(), 0);
});
