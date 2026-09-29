import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSocialProfiles, saveSocialProfiles } from '../../../server/domains/socialProfiles.js';
import { isolatedFixture } from './fixture.mjs';

const manual = (provider, changes = {}) => ({ provider, profileUrl: `https://example.test/${provider}`, followers: 100, avgLikes: 5, avgViews: 20, expectedUpdatedAt: null, ...changes });

test('manual social save validates every row before any write', async t => {
  const { prisma } = await isolatedFixture(t);
  for (const bad of [
    [manual('GitHub'), manual('Facebook', { followers: -1 })],
    [manual('GitHub'), manual('X', { profileUrl: 'javascript:alert(1)' })],
    [manual('GitHub'), manual('GitHub')],
  ]) await assert.rejects(saveSocialProfiles(prisma, 'owner-a', { rows: bad, removed: [] }), { status: 400 });
  assert.equal(await prisma.socialProfile.count(), 0);
  assert.equal(normalizeSocialProfiles({ rows: [manual('GitHub')], removed: [] }).rows[0].followers, 100);
});

test('manual social profiles are owner scoped, revision checked and explicitly removable', async t => {
  const { prisma } = await isolatedFixture(t);
  const [created] = await saveSocialProfiles(prisma, 'owner-a', { rows: [manual('GitHub')], removed: [] });
  assert.equal(created.profileUrl, 'https://example.test/GitHub');
  assert.equal((await prisma.socialProfile.findMany({ where: { userId: 'owner-b' } })).length, 0);
  await assert.rejects(saveSocialProfiles(prisma, 'owner-a', { rows: [manual('GitHub', { followers: 200 })], removed: [] }), { status: 409 });
  assert.equal((await prisma.socialProfile.findUnique({ where: { id: created.id } })).followers, 100);
  const [updated] = await saveSocialProfiles(prisma, 'owner-a', { rows: [manual('GitHub', { followers: 200, expectedUpdatedAt: created.updatedAt.toISOString() })], removed: [] });
  assert.equal(updated.followers, 200);
  await assert.rejects(saveSocialProfiles(prisma, 'owner-b', { rows: [], removed: [{ provider: 'GitHub', expectedUpdatedAt: updated.updatedAt.toISOString() }] }), { status: 409 });
  await saveSocialProfiles(prisma, 'owner-a', { rows: [], removed: [{ provider: 'GitHub', expectedUpdatedAt: updated.updatedAt.toISOString() }] });
  assert.equal(await prisma.socialProfile.count(), 0);
});

test('manual social save rolls back earlier updates on later conflict', async t => {
  const { prisma } = await isolatedFixture(t);
  const [github, youtube] = await saveSocialProfiles(prisma, 'owner-a', { rows: [manual('GitHub'), manual('YouTube')], removed: [] });
  await assert.rejects(saveSocialProfiles(prisma, 'owner-a', { rows: [
    manual('GitHub', { followers: 300, expectedUpdatedAt: github.updatedAt.toISOString() }),
    manual('YouTube', { followers: 400, expectedUpdatedAt: null }),
  ], removed: [] }), { status: 409 });
  assert.equal((await prisma.socialProfile.findUnique({ where: { id: github.id } })).followers, 100);
  assert.equal((await prisma.socialProfile.findUnique({ where: { id: youtube.id } })).followers, 100);
});
