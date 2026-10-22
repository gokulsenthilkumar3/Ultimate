// @vitest-environment node
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import useStore from '../useStore';
import { apiRequest } from '../../lib/apiClient';
import { sanitizeAvatarPresentation } from '../../lib/avatarPresentation';
import { addAvatarPerson, createAvatarPerson, patchAvatarPerson } from '../../lib/avatarPeople';

vi.mock('../../lib/apiClient', () => ({ apiRequest: vi.fn() }));
vi.mock('../../lib/logger', () => ({ logCRUD: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../utils/safeLocalStorage', () => ({ safeLocalStorage: { getItem: () => null, setItem() {}, removeItem() {} } }));

// Exercise the real store serialization and the existing Prisma JSON column in
// a newly created SQLite file. The HTTP boundary is an adapter in this test;
// the browser smoke separately verifies the actual UI endpoint/payload flow.
let directory, prisma, url;
const connect = () => new PrismaClient({ adapter: new PrismaLibSql({ url }) });
beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'growthtrack-appearance-test-'));
  url = `file:${path.join(directory, 'appearance.db').replaceAll('\\', '/')}`;
  prisma = connect();
  await prisma.$executeRawUnsafe('CREATE TABLE "User" (id TEXT PRIMARY KEY, physiqueTargets TEXT, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP)');
  await prisma.$executeRawUnsafe("INSERT INTO User (id) VALUES ('appearance-owner'), ('other-owner')");
  apiRequest.mockImplementation(async (endpoint, options) => {
    expect(endpoint).toBe('/api/physique_targets'); expect(options.method).toBe('POST');
    return prisma.user.update({ where: { id: useStore.getState().user.id },
      data: { physiqueTargets: JSON.stringify(JSON.parse(options.body)) }, select: { id: true, physiqueTargets: true } });
  });
});
afterAll(async () => {
  await prisma?.$disconnect();
  if (directory) {
    const relative = path.relative(tmpdir(), directory);
    if (!relative.startsWith('growthtrack-appearance-test-') || relative.includes(path.sep)) throw new Error('Unexpected appearance fixture path.');
    // Native SQLite may hold the fixture until the process exits on Windows.
    await rm(directory, { recursive: true, force: true }).catch(error => { if (error.code !== 'EBUSY') throw error; });
  }
});

it('retains saved Current/Goal detail after reconnecting to SQLite and preserves other owners', async () => {
  useStore.getState().resetSessionData();
  const initial = { viewerPreferences: { spaceSky: 'nebula' }, goalMetrics: { weight: 70 } };
  useStore.setState({ user: { id: 'appearance-owner' }, physiqueTargets: initial });
  const current = { hairGrey: .35, hairDensity: .6, hairSeed: 456, skinFreckleDensity: .4, skinFreckleSizeMm: .8, skinFreckleContrast: .5, skinFreckleSeed: 789,
    eyeColor: '#4e7897', eyePupilMode: 'exposure', eyePupilSizeMm: 4.2, eyeIrisDetail: .8, eyeSeed: 321, irisLimbalRing: false, skinMicroDetail:.8 };
  const goal = { hairGrey: .1, hairDensity: .9, hairSeed: 654, skinFreckleDensity: .2, skinFreckleSeed: 987,
    eyeColor: '#507453', eyePupilMode: 'fixed', eyePupilSizeMm: 5.1, eyeSeed: 987, irisLimbalRing: true };
  const viewerPreferences=sanitizeAvatarPresentation({spaceSky:'nebula',poseStudio:{
    current:{enabled:true,joints:{head:[0,25,0]},targets:{leftWrist:[.3,-.6,.2]},digits:{leftHand:{shape:'fist',strength:.7,spread:0},rightFoot:{curl:.3}}},
    goal:{enabled:true,joints:{head:[0,-20,0]},targets:{rightAnkle:[-.2,-.7,.1]}}},
    cameraBookmarks:[{id:'db-view',name:'Saved orbit',view:{azimuth:.6,polar:1.3,distanceRatio:2,targetOffset:[0,.5,0]}}]});
  await Promise.all([
    useStore.getState().updatePhysiqueTargets(latest => ({ ...latest, appearanceMetrics: current })),
    useStore.getState().updatePhysiqueTargets(latest => ({ ...latest, goalMetrics: { ...latest.goalMetrics, ...goal } })),
    useStore.getState().updatePhysiqueTargets(latest => ({...latest,viewerPreferences})),
  ]);
  await prisma.$disconnect(); prisma = connect();
  const saved = await prisma.user.findUnique({ where: { id: 'appearance-owner' }, select: { physiqueTargets: true } });
  expect(JSON.parse(saved.physiqueTargets)).toEqual({ ...initial,viewerPreferences, appearanceMetrics: current, goalMetrics: { weight: 70, ...goal } });
  const other = await prisma.user.findUnique({ where: { id: 'other-owner' }, select: { physiqueTargets: true } });
  expect(other.physiqueTargets).toBeNull();
});

it('reconnects with separate people, measurements, poses and owner records after concurrent queued edits', async () => {
  useStore.getState().resetSessionData();
  useStore.setState({ user: { id: 'appearance-owner' }, physiqueTargets: { goalMetrics: { waist: 80 } } });
  await useStore.getState().updatePhysiqueTargets(latest => addAvatarPerson(latest, createAvatarPerson('Buddy', 'male', 'buddy')));
  await useStore.getState().updatePhysiqueTargets(latest => addAvatarPerson(latest, createAvatarPerson('Alex', 'neutral', 'alex')));
  await Promise.all([
    useStore.getState().updatePhysiqueTargets(latest => patchAvatarPerson(latest, 'buddy', person => ({ bodyProfile: { ...person.bodyProfile, heightCm: 182.88, handLengthCm: 21 } }))),
    useStore.getState().updatePhysiqueTargets(latest => patchAvatarPerson(latest, 'alex', person => ({ bodyProfile: { ...person.bodyProfile, heightCm: 168, handLengthCm: 18 } }))),
    useStore.getState().updatePhysiqueTargets(latest => patchAvatarPerson(latest, 'buddy', () => ({ physiqueTargets: { goalMetrics: { handLength: 22 }, morphOverrides: { current: { jaw_width: .7 } }, viewerPreferences: { poseStudio: { current: { enabled: true, joints: { head: [0, 20, 0] } } } } } }))),
  ]);
  await prisma.$disconnect(); prisma = connect();
  const saved = JSON.parse((await prisma.user.findUnique({ where: { id: 'appearance-owner' }, select: { physiqueTargets: true } })).physiqueTargets);
  expect(saved.goalMetrics).toEqual({ waist: 80 });
  expect(saved.avatarPeople.people[0]).toMatchObject({ id: 'buddy', bodyProfile: { heightCm: 182.88, handLengthCm: 21 }, physiqueTargets: { goalMetrics: { handLength: 22 }, morphOverrides: { current: { jaw_width: .7 } } } });
  expect(saved.avatarPeople.people[1]).toMatchObject({ id: 'alex', bodyProfile: { heightCm: 168, handLengthCm: 18 }, physiqueTargets: {} });
  expect((await prisma.user.findUnique({ where: { id: 'other-owner' }, select: { physiqueTargets: true } })).physiqueTargets).toBeNull();
});
