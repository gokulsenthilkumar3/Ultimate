import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { readGlb } from './plan-preview/glb.mjs';
import { sceneFromGlb } from './human75/glb-tools.mjs';
import { decompressGlb } from './human-realism/glb-family.mjs';
import { scopeFacialMorphs } from '../src/components/morphEngine/facialMorphScope.js';
import { fitModelFeatures } from '../src/components/morphEngine/fitModelFeatures.js';
import { prepareFaceGeometry, createMouthInterior } from '../src/components/morphEngine/faceGeometry.js';
import { inspectHeadCapabilities } from '../src/components/morphEngine/headCapabilities.js';
import { HEAD_FEATURES, HEAD_FEATURE_REGISTRY_VERSION } from '../src/lib/headFeatureRegistry.js';

process.chdir(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const sha256 = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const files = [
  ...['base', 'adult-v2', 'preview-75'].flatMap(name => [`humanoid-${name}.glb`, `humanoid-${name}-lite.glb`]),
  'humanoid-human-r2-core.glb', 'humanoid-human-r2-hero.glb',
];
const assets = [];
for (const file of files) {
  const source = 'public/assets/models/' + file;
  const { body, features } = sceneFromGlb(await decompressGlb(readGlb(source)));
  // R2 carries the correction baked into its mesh extras. Retained models
  // receive the same mouth preparation as useModelLoader on their own clone.
  if (!body.userData.growthtrack?.nativeFamily) {
    scopeFacialMorphs(body);
    fitModelFeatures(body, features);
    prepareFaceGeometry(body, features);
  }
  const capabilities = inspectHeadCapabilities(body);
  assert.equal(capabilities.shapeTargets.length, HEAD_FEATURES.length, file + ': missing shape binding');
  assert.equal(capabilities.expressionTargets.length, 3, file + ': missing expression binding');
  const mouth = createMouthInterior(body);
  assert.ok(mouth, file + ': oral assembly missing');
  const expressions = [];
  for (const jaw of [0, .25, .65, 1, 0]) {
    body.morphTargetInfluences[body.morphTargetDictionary.jaw_open] = jaw;
    mouth.update();
    mouth.group.updateMatrixWorld(true);
    for (const part of [mouth.group, mouth.upper, mouth.lower]) {
      assert.ok(part.matrixWorld.elements.every(Number.isFinite), file + ': invalid oral transform');
    }
    expressions.push({ jaw, ...structuredClone(body.userData.mouthInterior) });
  }
  assets.push({ file, sha256: sha256(source), capabilities, expressions });
  mouth.dispose();
}
const sources = [
  'src/lib/headFeatureRegistry.js', 'src/components/morphEngine/headCapabilities.js',
  'src/components/morphEngine/faceGeometry.js', 'src/components/morphEngine/dentalGeometry.js',
];
const report = {
  version: 1, generatedAt: new Date().toISOString(), registryVersion: HEAD_FEATURE_REGISTRY_VERSION,
  status: 'engineering-capability-inventory',
  limits: [
    'Finite nonzero morph displacement confirms binding; it does not establish calibrated dimensions or likeness.',
    'The dental assembly is a project-authored procedural fallback, not scanned or clinical dentition.',
    'Sampled jaw states do not certify contact in every expression or establish whole-head realism.',
  ],
  sourceHashes: Object.fromEntries(sources.map(file => [file, sha256(file)])), assets,
};
const output = 'docs/real-human-3d/data/head-anatomy/capabilities.json';
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output, assets: assets.length, shapeControls: HEAD_FEATURES.length, status: report.status }));
