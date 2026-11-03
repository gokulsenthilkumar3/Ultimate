import test from 'node:test';
import assert from 'node:assert/strict';
import { migratedFixture } from './fixture.mjs';
import { prepareUserStructures, saveUserStructures, loadUserStructures } from '../../../server/domains/userStructures.js';

const skill = { id: 123, name: 'Drawing', category: 'creative', xp: 0, description: 'Practice shading', weeklyTarget: 3, resource: '', nextAction: 'Draw a cube', lastPracticed: null, practiceCount: 0, createdAt: '2026-11-03T08:00:00.000Z' };
const project = { id: 'project', title: 'Sketchbook', description: '', stack: 'Pencil', status: 'active', url: '', startDate: '2026-11-03', endDate: null };
const assessment = { round: 'Baseline', color: '#123456', items: [{ key: 'practice', q: 'Practice this week?', a: '', custom: false }] };

test('populated skill/project/assessment migration promotes fields and preserves identities, order, nulls and extensions', async t => {
  const { prisma } = await migratedFixture(t, (db, name) => {
    if (name !== '20261102170000_typed_user_collections') return;
    db.exec("INSERT INTO User(id,email,passwordHash,fullName,referralCode,createdAt,updatedAt) VALUES ('owner-a','a@example.test','hash','A','ref-a','2026-10-01 10:00:00','2026-10-02 10:00:00'),('bad','bad@example.test','hash','B','bad','2026-10-01 10:00:00','2026-10-02 10:00:00')");
    db.prepare('UPDATE User SET skills=?,manualProjects=?,assessmentQA=?,repoNotes=? WHERE id=?').run(
      JSON.stringify([{ ...skill, extra: { provider: 'custom' } }, { id: 'two', name: 'Cooking', xp: 10 }]), JSON.stringify([project]), JSON.stringify([assessment]), JSON.stringify({ 'repo-1': 'Read the guide' }), 'owner-a');
    db.exec(`UPDATE User SET skills='not json',manualProjects='[false]',assessmentQA='[{"items":["malformed"]}]',repoNotes='{"repo":false}' WHERE id='bad'`);
  });
  const user = await prisma.user.findUnique({ where: { id: 'owner-a' } });
  for (const field of ['skills','manualProjects','assessmentQA','repoNotes']) assert.equal(user[field], null);
  assert.equal(user.updatedAt.toISOString(), '2026-10-02T10:00:00.000Z');
  const rows = await prisma.userSkill.findMany({ where: { userId: 'owner-a' }, orderBy: { position: 'asc' } });
  assert.equal(rows[0].name, skill.name);
  assert.equal(rows[0].xp, 0);
  assert.equal(rows[0].practiceCount, 0);
  assert.deepEqual(JSON.parse(rows[0].data), { lastPracticed: null, extra: { provider: 'custom' } });
  assert.equal(rows[0].updatedAt.toISOString(), '2026-10-02T10:00:00.000Z');
  const loaded = await loadUserStructures(prisma, user.id, user);
  assert.deepEqual(loaded.skills, [{ ...skill, extra: { provider: 'custom' } }, { id: 'two', name: 'Cooking', xp: 10 }]);
  assert.deepEqual(loaded.manualProjects, [project]);
  assert.deepEqual(loaded.assessmentQA, [assessment]);
  assert.deepEqual(loaded.repoNotes, { 'repo-1': 'Read the guide' });
  const bad = await prisma.user.findUnique({ where: { id: 'bad' } });
  const retained = await loadUserStructures(prisma, bad.id, bad);
  assert.equal(retained.skills, 'not json');
  assert.deepEqual(retained.manualProjects, [false]);
  assert.deepEqual(retained.assessmentQA, [{ items: ['malformed'] }]);
  assert.deepEqual(retained.repoNotes, { repo: false });
});

test('actual user collection saves create typed records, reload by owner and remove cleared collections', async t => {
  const { prisma } = await migratedFixture(t);
  const input = { skills: [skill], manualProjects: [project], assessmentQA: [assessment], repoNotes: { repository: 'Keep this note' } };
  await saveUserStructures(prisma, 'owner-a', prepareUserStructures(input));
  assert.deepEqual(await loadUserStructures(prisma, 'owner-a'), input);
  assert.deepEqual(await loadUserStructures(prisma, 'owner-b'), { skills: [], manualProjects: [], assessmentQA: [], repoNotes: {} });
  const stored = await prisma.userSkill.findFirst({ where: { userId: 'owner-a' } });
  assert.equal(stored.createdBy, 'owner-a');
  assert.equal(stored.nextAction, skill.nextAction);
  assert.equal(Object.hasOwn(JSON.parse(stored.data || '{}'), 'name'), false);
  await saveUserStructures(prisma, 'owner-a', prepareUserStructures({ skills: [{ ...skill, xp: 25, practiceCount: 1 }] }));
  assert.equal((await loadUserStructures(prisma, 'owner-a')).skills[0].xp, 25);
  assert.deepEqual((await loadUserStructures(prisma, 'owner-a')).manualProjects, [project]);
  await saveUserStructures(prisma, 'owner-a', prepareUserStructures({ skills: [], assessmentQA: [] }));
  assert.equal(await prisma.userSkill.count(), 0);
  assert.equal(await prisma.assessmentAnswer.count(), 0);
  assert.deepEqual((await loadUserStructures(prisma, 'owner-a')).skills, []);
});

test('invalid input and late database failures cannot partially replace user-owned records', async t => {
  const { prisma } = await migratedFixture(t);
  await saveUserStructures(prisma, 'owner-a', prepareUserStructures({ skills: [skill] }));
  for (const invalid of [NaN, Infinity, false, '4']) assert.throws(() => prepareUserStructures({ skills: [{ ...skill, xp: invalid }] }), error => error.status === 400);
  for (const invalid of [-1, 0.1, 2147483648]) assert.throws(() => prepareUserStructures({ skills: [{ ...skill, practiceCount: invalid }] }), error => error.status === 400);
  const prepared = prepareUserStructures({ skills: [{ ...skill, xp: 100 }], assessmentQA: [assessment] });
  await prisma.$executeRawUnsafe(`CREATE TRIGGER fail_assessment BEFORE INSERT ON assessment_answers BEGIN SELECT RAISE(ABORT,'injected failure'); END`);
  // Prisma reports SQLite RAISE(ABORT) as a constraint failure.
  await assert.rejects(saveUserStructures(prisma, 'owner-a', prepared), { code: 'P2003' });
  assert.deepEqual((await loadUserStructures(prisma, 'owner-a')).skills, [skill]);
  assert.equal(await prisma.assessmentRound.count(), 0);
});
