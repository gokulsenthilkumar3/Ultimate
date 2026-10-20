import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MANIFEST, checkAssetProvenance, shippedAssets } from '../../../scripts/check-asset-provenance.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const component = (status = 'project') => ({ name: 'Mesh', source: 'Generated', licence: 'Project-authored', status });

async function fixture(t, files, manifest) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'growthtrack-provenance-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [relative, bytes] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, relative)), { recursive: true });
    await writeFile(path.join(root, relative), bytes);
  }
  if (manifest) {
    await mkdir(path.dirname(path.join(root, MANIFEST)), { recursive: true });
    await writeFile(path.join(root, MANIFEST), typeof manifest === 'string' ? manifest : JSON.stringify(manifest));
  }
  return root;
}

test('the repository manifest covers every shipped asset with current hashes and verified licences', async () => {
  const result = await checkAssetProvenance({ root: repoRoot });
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, [], 'no component licence is left unresolved');
  const release = await checkAssetProvenance({ root: repoRoot, release: true });
  assert.deepEqual([release.ok, release.errors], [true, []], 'release builds pass once every licence is verified');
});

test('finds 3D formats anywhere in public and textures beside the models', async t => {
  const root = await fixture(t, { 'public/a.glb': 'x', 'public/assets/models/skin.png': 'x', 'public/logo.png': 'x', 'public/deep/scene.gltf': 'x' });
  assert.deepEqual(await shippedAssets(root), ['public/a.glb', 'public/assets/models/skin.png', 'public/deep/scene.gltf']);
});

test('fails on unlisted files, stale hashes, malformed components and missing listed files', async t => {
  const body = Buffer.from('mesh-v1');
  const root = await fixture(t, { 'public/assets/models/body.glb': body, 'public/assets/models/extra.glb': 'y' }, {
    assets: [
      { path: 'public/assets/models/body.glb', sha256: hash('mesh-v0'), components: [{ name: 'Mesh', status: 'maybe' }] },
      { path: 'public/assets/models/gone.glb', sha256: hash('z'), components: [component()] },
    ],
  });
  const { ok, errors } = await checkAssetProvenance({ root });
  assert.equal(ok, false);
  for (const expected of [/extra\.glb: no provenance entry/, /body\.glb: sha256 .* does not match/, /missing source/, /missing licence/, /status must be/, /gone\.glb: listed in the manifest but not found/]) {
    assert.ok(errors.some(error => expected.test(error)), `${expected} in ${errors.join(' | ')}`);
  }
});

test('shared component lists resolve, and unresolved licences block only release builds', async t => {
  const root = await fixture(t, { 'public/assets/models/full.glb': 'full', 'public/assets/models/lite.glb': 'lite' }, {
    assets: [
      { path: 'public/assets/models/full.glb', sha256: hash('full'), components: [component(), { ...component('unresolved'), licence: 'AGPLv3 header' }] },
      { path: 'public/assets/models/lite.glb', sha256: hash('lite'), sameComponentsAs: 'public/assets/models/full.glb' },
    ],
  });
  const ci = await checkAssetProvenance({ root });
  assert.deepEqual([ci.ok, ci.warnings.length], [true, 2]);
  const release = await checkAssetProvenance({ root, release: true });
  assert.deepEqual([release.ok, release.errors.length], [false, 2]);
});

test('a missing or unreadable manifest fails clearly', async t => {
  const missing = await fixture(t, { 'public/a.glb': 'x' });
  assert.match((await checkAssetProvenance({ root: missing })).errors[0], /missing/);
  const broken = await fixture(t, { 'public/a.glb': 'x' }, '{not json');
  assert.match((await checkAssetProvenance({ root: broken })).errors[0], /not valid JSON/);
});
