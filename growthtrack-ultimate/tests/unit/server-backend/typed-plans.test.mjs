import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { migratedFixture } from './fixture.mjs';
import { PLAN_DOCUMENTS, preparePlanDocuments, loadPlanDocuments } from '../../../server/domains/planDocuments.js';
import { PLAN_MIGRATION } from '../../../server/domains/planContract.js';
import { saveUserStructures } from '../../../server/domains/userStructures.js';
import { planPrismaModels } from '../../../scripts/generate-plan-records.mjs';

const plans = {
  trainingPlan: { streak: 0, longestStreak: 4, lastCompletedDate: null, schedule: [{ id: 'mon', day: 'Mon', muscleGroup: 'Upper', exercises: [{ id: 17, name: 'Row', sets: 3, reps: 8, weight: 0, createdAt: '2026-11-03', extension: { machine: 'custom' } }] }], PRs: { benchPress: 50, squat: null }, prHistory: [{ date: '2026-11-03', lift: 'benchPress', weight: 50 }] },
  nutritionStrategy: { calories: 2000, protein_g: 100, meals: [{ id: 'lunch', name: 'Lunch', time: '12:30', icon: 'plate', items: ['Rice', 'Beans'] }], preference: { vegetarian: true } },
  medicalData: { testsRequired: [{ id: 'test', name: 'Owner supplied test', priority: 'Low', frequency: 'As recorded', status: null }], extension: false },
  physiqueTargets: { goalMetrics: { headCirc: 58, footLength: 27, waist: 80, customText: '', customFlag: false, cleared: null }, appearanceMetrics: { hairStyle: 'short', skinDetails: { marks: [] } }, privateMetrics: {}, targets: [{ id: 'target', metric: 'waist', label: 'Waist', current: 90, target: '80 cm' }], milestones: [{ id: 'mile', label: 'First check-in', targetDate: '2026-12-01', achieved: false }], zones: [{ name: 'Back', status: 'Maintenance', icon: 'back' }], viewerPreferences: { background: 'studio' } },
};

test('populated plan migrations extract schedules, meals, medical tests and physique records while preserving legacy shape and timestamps', async t => {
  const { prisma } = await migratedFixture(t, (db, name) => {
    if (name !== PLAN_MIGRATION) return;
    db.exec("INSERT INTO User(id,email,passwordHash,fullName,referralCode,createdAt,updatedAt) VALUES ('owner-a','a@example.test','hash','A','ref-a','2026-10-01 10:00:00','2026-10-02 10:00:00'),('owner-b','b@example.test','hash','B','ref-b','2026-10-01 10:00:00','2026-10-02 10:00:00')");
    for (const [field, value] of Object.entries(plans)) db.prepare(`UPDATE User SET "${field}"=? WHERE id='owner-a'`).run(JSON.stringify(value));
    db.exec(`UPDATE User SET trainingPlan='not json',medicalData='[false]',nutritionStrategy='{"meals":["malformed"]}',physiqueTargets='{"milestones":null,"goalMetrics":{"waist":{"unknown":true}}}' WHERE id='owner-b'`);
  });
  const user = await prisma.user.findUnique({ where: { id: 'owner-a' } });
  assert.deepEqual(await loadPlanDocuments(prisma, user.id, user), plans);
  for (const field of Object.keys(plans)) assert.equal(user[field], null, `${field} no longer stores its records as a User document`);
  assert.equal(user.updatedAt.toISOString(), '2026-10-02T10:00:00.000Z');
  const plan = await prisma.trainingPlan.findUnique({ where: { userId: user.id }, include: { schedule: { include: { exercises: true } }, readings: true } });
  assert.equal(plan.streak, 0); assert.equal(plan.data, null);
  assert.equal(plan.updatedAt.toISOString(), '2026-10-02T10:00:00.000Z');
  assert.equal(plan.schedule[0].exercises[0].sets, 3);
  assert.deepEqual(JSON.parse(plan.schedule[0].exercises[0].data), { extension: { machine: 'custom' } });
  assert.equal(plan.readings.find(row => row.key === 'benchPress').unit, 'kg');
  const physique = await prisma.physiquePlan.findUnique({ where: { userId: user.id }, include: { readings: true, targets: true } });
  assert.equal(physique.readings.find(row => row.key === 'headCirc').unit, 'cm');
  assert.equal(physique.readings.find(row => row.key === 'footLength').value, 27);
  assert.equal(physique.targets[0].currentValue, 90);
  assert.equal(physique.targets[0].targetStringValue, '80 cm');
  assert.deepEqual(JSON.parse(physique.data), { appearanceMetrics: { skinDetails: { marks: [] } }, viewerPreferences: { background: 'studio' } });
  const other = await prisma.user.findUnique({ where: { id: 'owner-b' } });
  assert.deepEqual(await loadPlanDocuments(prisma, other.id, other), { trainingPlan: 'not json', medicalData: [false], nutritionStrategy: { meals: ['malformed'] }, physiqueTargets: { milestones: null, goalMetrics: { waist: { unknown: true } } } });
});

test('actual plan writes reload typed records, replace children, preserve root identity and clear omitted fields and whole documents', async t => {
  const { prisma } = await migratedFixture(t);
  await saveUserStructures(prisma, 'owner-a', {}, {}, preparePlanDocuments(plans));
  assert.deepEqual(await loadPlanDocuments(prisma, 'owner-a'), plans);
  assert.deepEqual(await loadPlanDocuments(prisma, 'owner-b'), { trainingPlan: null, nutritionStrategy: null, medicalData: null, physiqueTargets: null });
  const original = await prisma.trainingPlan.findUnique({ where: { userId: 'owner-a' } });
  const replacement = { schedule: [], PRs: {}, streak: 1 };
  await saveUserStructures(prisma, 'owner-a', {}, {}, preparePlanDocuments({ trainingPlan: replacement }));
  const after = await prisma.trainingPlan.findUnique({ where: { userId: 'owner-a' } });
  assert.equal(after.id, original.id); assert.equal(after.longestStreak, null); assert.equal(after.createdAt.getTime(), original.createdAt.getTime());
  assert.equal(await prisma.trainingDay.count(), 0); assert.equal(await prisma.plannedExercise.count(), 0); assert.equal(await prisma.trainingPersonalRecord.count(), 0);
  assert.deepEqual((await loadPlanDocuments(prisma, 'owner-a')).trainingPlan, replacement);
  assert.deepEqual((await loadPlanDocuments(prisma, 'owner-a')).medicalData, plans.medicalData);
  await saveUserStructures(prisma, 'owner-a', {}, {}, preparePlanDocuments({ physiqueTargets: null, medicalData: { testsRequired: null } }));
  assert.equal(await prisma.physiquePlanMeasurement.count(), 0); assert.equal(await prisma.physiqueTarget.count(), 0);
  assert.equal((await loadPlanDocuments(prisma, 'owner-a')).physiqueTargets, null);
  assert.deepEqual((await loadPlanDocuments(prisma, 'owner-a')).medicalData, { testsRequired: null });
});

test('invalid writes and late child failures cannot replace another owner or partially clear a plan', async t => {
  const { prisma } = await migratedFixture(t);
  await saveUserStructures(prisma, 'owner-a', {}, {}, preparePlanDocuments(plans));
  for (const input of [{ trainingPlan: { streak: 1.5 } }, { trainingPlan: { schedule: [false] } }, { nutritionStrategy: { meals: [{ items: [false] }] } }, { physiqueTargets: { goalMetrics: { waist: Infinity } } }]) assert.throws(() => preparePlanDocuments(input), error => error.status === 400);
  await prisma.$executeRawUnsafe(`CREATE TRIGGER fail_plan_exercise BEFORE INSERT ON planned_exercises BEGIN SELECT RAISE(ABORT,'injected plan failure'); END`);
  await assert.rejects(saveUserStructures(prisma, 'owner-a', {}, {}, preparePlanDocuments({ trainingPlan: { ...plans.trainingPlan, streak: 20 }, physiqueTargets: null })), { code: 'P2003' });
  assert.deepEqual(await loadPlanDocuments(prisma, 'owner-a'), plans);
  assert.equal((await prisma.user.findUnique({ where: { id: 'owner-a' } })).trainingPlan, null);
});

test('partial edits retain unchanged malformed legacy fields, while numeric form strings become typed values', async t => {
  const { prisma } = await migratedFixture(t, (db, name) => {
    if (name !== PLAN_MIGRATION) return;
    db.exec("INSERT INTO User(id,email,passwordHash,fullName,referralCode) VALUES ('owner-a','a@example.test','hash','A','ref-a')");
    db.prepare("UPDATE User SET trainingPlan=? WHERE id='owner-a'").run(JSON.stringify({ streak: 'unknown', schedule: [{ id: 'day', exercises: [{ id: 'ex', sets: '3', reps: 'unknown' }] }], PRs: { benchPress: 'unknown' } }));
  });
  const before = await loadPlanDocuments(prisma, 'owner-a');
  assert.equal(before.trainingPlan.schedule[0].exercises[0].sets, 3);
  const next = { ...before.trainingPlan, longestStreak: 5 };
  await saveUserStructures(prisma, 'owner-a', {}, {}, preparePlanDocuments({ trainingPlan: next }, before));
  assert.deepEqual((await loadPlanDocuments(prisma, 'owner-a')).trainingPlan, next);
  assert.throws(() => preparePlanDocuments({ trainingPlan: { ...next, streak: 'another invalid value' } }, { trainingPlan: next }), error => error.status === 400);
});

test('plan model generation matches the reviewed schema contract', () => {
  const schema = fs.readFileSync(new URL('../../../prisma/schema.prisma', import.meta.url), 'utf8').replaceAll('\r\n', '\n');
  assert.ok(schema.endsWith(planPrismaModels()));
  assert.equal(Object.keys(PLAN_DOCUMENTS).length, 4);
});
