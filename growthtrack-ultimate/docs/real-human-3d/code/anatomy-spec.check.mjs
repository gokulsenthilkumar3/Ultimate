import test from 'node:test';
import assert from 'node:assert/strict';
import { ANATOMY, FACE_BLENDSHAPES, REQUEST_INDEX, GROUPS, RIG_GROUPS, RIG_JOINT_BUDGET, SHIPPED_JOINTS, TEXTURE_TILES, TIER_TEXTURE_BUDGET_MIB, TIER_TILE_LEVELS, TILE_MIN_TEXELS, tileDensity, tileMiB } from './anatomy-spec.mjs';
import { appearanceFields, auditCatalogue, existingMetricNames, viewerRegionNames, wardrobePresets } from './repo-facts.mjs';

const ids = new Set(ANATOMY.map(a => a.id));
const byId = Object.fromEntries(ANATOMY.map(a => [a.id, a]));

test('ids are unique, groups and statuses are valid, every entry says what is real and how it is built', () => {
  assert.equal(ids.size, ANATOMY.length);
  for (const a of ANATOMY) {
    assert.ok(GROUPS[a.group], `${a.id}: group ${a.group}`);
    assert.ok(['mesh', 'skin-surface', 'partial', 'absent'].includes(a.today), `${a.id}: today ${a.today}`);
    assert.ok(a.real?.length > 40 && a.build?.length > 40, `${a.id}: real/build text`);
    assert.ok(a.tile === null || TEXTURE_TILES[a.tile], `${a.id}: tile ${a.tile}`);
    assert.ok(Array.isArray(a.metrics) && Array.isArray(a.newMetrics) && Array.isArray(a.bones), `${a.id}: arrays`);
  }
});

test('every metric the spec says drives a part exists in the app, and new metrics do not collide with existing names', () => {
  const existing = existingMetricNames();
  for (const a of ANATOMY) {
    for (const key of a.metrics) assert.ok(existing.has(key), `${a.id}: metric "${key}" is not in the app`);
    for (const key of a.newMetrics) assert.ok(!existing.has(key), `${a.id}: new metric "${key}" already exists in the app`);
  }
});

test('appearance fields and viewer regions named by the spec exist in the app', () => {
  const appearance = appearanceFields(); const regions = viewerRegionNames();
  for (const a of ANATOMY) {
    for (const f of a.appearance ?? []) assert.ok(appearance.has(f), `${a.id}: appearance "${f}"`);
    assert.ok(a.region === null || regions.has(a.region), `${a.id}: region "${a.region}"`);
  }
});

test('every wardrobe preset in the app has a part that plans its garments', () => {
  const planned = { GYM: 'wear_gym', CASUAL: 'wear_casual', FORMAL: 'wear_formal', SWIMWEAR: 'wear_swimwear', UNDERWEAR: 'wear_underwear', ANATOMICAL: 'adult_external', BODY_COMP: 'wear_body_comp' };
  for (const preset of wardrobePresets()) assert.ok(planned[preset] && ids.has(planned[preset]), `wardrobe preset ${preset} has no planned part`);
});

test('every part the GLB audit found missing or thin has a plan', () => {
  const map = {
    'Head': ['cranium_scalp'], 'Hair (scalp)': ['scalp_hair'], 'Eyebrows': ['eyebrows'], 'Eyelashes': ['eyelashes'],
    'Eyes (eyeball, iris, cornea)': ['eyeballs'], 'Eyelids': ['eyelids'], 'Eye bones (gaze)': ['eye_gaze'],
    'Tear line, caruncle, wet line': ['eye_corners'], 'Nose': ['nose'], 'Ears': ['ears'], 'Lips': ['lips'],
    'Teeth, gums, tongue, mouth interior': ['teeth_gums_tongue'], 'Jaw (articulation)': ['jaw_chin'], 'Neck': ['neck'],
    'Shoulders and clavicles': ['shoulders_clavicles'], 'Chest, ribcage, spine': ['chest', 'back'], 'Nipples, navel': ['chest', 'core'],
    'Arms (upper arm, forearm)': ['upper_arm', 'forearm'], 'Hands and fingers': ['fingers', 'palm', 'hand_dorsum'],
    'Fingernails and toenails': ['fingernails', 'toenails'], 'Hips, glutes, pelvis': ['waist_hips', 'glutes'],
    'Thighs, knees, calves': ['thigh', 'knee', 'calf'], 'Feet, ankles, toes': ['foot', 'ankle', 'toes'],
    'Body hair (chest, arms, legs, underarm, pubic)': ['body_hair', 'underarm_hair'], 'Facial hair (beard, moustache, stubble)': ['facial_hair'],
    'Skin: base colour': ['skin_tone'], 'Skin: pores, wrinkles, scars, moles, veins': ['skin_surface', 'skin_features', 'skin_blood'],
    'Skin: tan, regional pigment, hyper-pigmentation': ['skin_tan', 'skin_blood'],
    'Clothing (briefs, shorts, shirt, shoes)': ['wear_underwear', 'wear_swimwear', 'wear_gym', 'wear_casual', 'wear_formal', 'wear_footwear'],
    'Adult external anatomy': ['adult_external'], 'Skeleton, muscles, fat (underlay)': ['underlay_skeleton', 'underlay_muscle', 'underlay_fat', 'underlay_organs'],
  };
  const normal = { 'separate mesh': 'mesh', 'part of the skin surface': 'skin-surface', partial: 'partial', absent: 'absent' };
  for (const row of auditCatalogue()) {
    const targets = map[row.part];
    assert.ok(targets, `the audit reports "${row.part}" and the spec has no plan for it`);
    for (const id of targets) assert.ok(ids.has(id), `${row.part} -> ${id} is not in the spec`);
    const statuses = targets.map(id => byId[id].today);
    assert.ok(statuses.includes(normal[row.status]), `"${row.part}" is "${row.status}" in the audit but the spec says ${statuses.join('/')}`);
  }
});

test('the GLB v3 rig is within budget, extends the shipped one, and every named joint exists', () => {
  const all = Object.values(RIG_GROUPS).flat();
  assert.equal(new Set(all).size, all.length);
  assert.ok(all.length <= RIG_JOINT_BUDGET, `${all.length} joints`);
  for (const joint of SHIPPED_JOINTS) assert.ok(all.includes(joint), `shipped joint ${joint} is missing from v3`);
  for (const a of ANATOMY) for (const b of a.bones) assert.ok(b.startsWith('@') ? RIG_GROUPS[b.slice(1)] : all.includes(b), `${a.id}: unknown joint ${b}`);
});

test('texture tiles keep the density each region needs, and each quality tier fits its memory budget', () => {
  for (const [name, min] of Object.entries(TILE_MIN_TEXELS)) assert.ok(tileDensity(name) >= min, `${name}: ${tileDensity(name).toFixed(1)} < ${min}`);
  for (const [tier, levels] of Object.entries(TIER_TILE_LEVELS)) {
    const mib = Object.keys(TEXTURE_TILES).reduce((sum, name) => sum + tileMiB(name, levels[name]), 0);
    assert.ok(mib <= TIER_TEXTURE_BUDGET_MIB[tier], `${tier}: ${mib.toFixed(1)} MiB > ${TIER_TEXTURE_BUDGET_MIB[tier]}`);
  }
});

test('the 52 face blendshapes are the ARKit set, symmetrical, and unique', () => {
  assert.equal(FACE_BLENDSHAPES.length, 52); assert.equal(new Set(FACE_BLENDSHAPES).size, 52);
  for (const name of FACE_BLENDSHAPES) {
    if (name.endsWith('Left')) assert.ok(FACE_BLENDSHAPES.includes(name.replace(/Left$/, 'Right')), `${name} has no right side`);
    if (name.endsWith('Right')) assert.ok(FACE_BLENDSHAPES.includes(name.replace(/Right$/, 'Left')), `${name} has no left side`);
  }
});

test('every part named in the request is covered by an existing spec entry, and every entry is reachable from the request or the parts list', () => {
  for (const [word, targets] of REQUEST_INDEX) for (const id of targets) assert.ok(ids.has(id), `"${word}" points to unknown part ${id}`);
  const covered = new Set(REQUEST_INDEX.flatMap(([, targets]) => targets));
  const orphans = ANATOMY.filter((a) => !covered.has(a.id)).map((a) => a.id);
  assert.deepEqual(orphans, [], 'these parts are in the spec but not reachable from the request index');
});
