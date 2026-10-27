import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A pinned candidate, never an automatic replacement for an existing person's body.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const revision = '9952a5ae1c888179b25cf24ef97a4280be7ae7fd';
const upstream = `https://raw.githubusercontent.com/nirholas/three.ws/${revision}/`;
const files = [
  ['public/avatars/parametric-base.glb', 'public/assets/models/parametric-base-v1.glb', '6627588660aa6c754aaa2edb181bc01a8ca60c3b4c534efa3e87f636ce5cda18', 'parametric-base.glb'],
  ['avatar-sources/anny/LICENSE.md', 'public/assets/parametric/CC0.txt', 'f6089cba01cb570a24712b41ab8a586ccd3cc5ef53dc266ca50b95c288956d2c', 'CC0.txt'],
  ['avatar-sources/anny/README.md', 'public/assets/parametric/SOURCE.md', 'd423a0715e10fcc81f689ccd73b3d146fabd1b5ee8f3db982b2b11cec1907422', 'SOURCE.md'],
  ['LICENSE', 'public/assets/parametric/APACHE-2.0.txt', '08cadd94b53ae7cea79bc8f08e990e41f2982f652b2c9f1e1fd7623821e6c1f8', 'APACHE-2.0.txt'],
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

for (const [source, destination, expected, cache] of files) {
  const target = path.join(root, destination);
  let bytes = await readFile(target).catch(() => null);
  if (!bytes) bytes = await readFile(path.join(root, '.tmp/parametric-import', cache)).catch(() => null);
  if (!bytes) {
    const response = await fetch(upstream + source);
    if (!response.ok) throw new Error(`${source}: HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (sha(bytes) !== expected) throw new Error(`${destination}: pinned SHA-256 mismatch; refusing to overwrite.`);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
}

const bytes = await readFile(path.join(root, files[0][1]));
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
const bin = bytes.subarray(28 + jsonLength);
// Canonical bind positions, UV ordering and indices identify this basis. This
// hash describes the basis, not an assertion about an arbitrary imported mesh.
const topology = createHash('sha256');
for (const mesh of gltf.meshes) for (const primitive of mesh.primitives) {
  topology.update(mesh.name);
  for (const id of [primitive.attributes.POSITION, primitive.attributes.TEXCOORD_0, primitive.indices]) {
    const accessor = gltf.accessors[id], view = gltf.bufferViews[accessor.bufferView];
    topology.update(JSON.stringify({ type: accessor.type, count: accessor.count, componentType: accessor.componentType }));
    topology.update(bin.subarray((view.byteOffset || 0) + (accessor.byteOffset || 0), (view.byteOffset || 0) + view.byteLength));
  }
}
const manifest = {
  asset: { family: 'threews-parametric-v1', sourceRevision: revision, topologyHash: topology.digest('hex'), lod: 'base', rigVersion: 'mixamo-52-v1', materialVersion: 'growthtrack-skin-v2', sourceHash: sha(bytes), basisReference: 'basis.glb', parameterVersion: '1', solverVersion: 'cpu-identity-v1' },
  path: 'assets/models/parametric-base-v1.glb', bytes: bytes.length, license: 'CC0-1.0',
  source: `https://github.com/nirholas/three.ws/tree/${revision}/avatar-sources/anny`,
  morphTargets: gltf.meshes.find(mesh => mesh.name === 'Body').extras.targetNames,
  meshes: gltf.meshes.map(mesh => ({ name: mesh.name, vertices: gltf.accessors[mesh.primitives[0].attributes.POSITION].count, triangles: gltf.accessors[mesh.primitives[0].indices].count / 3, morphs: mesh.primitives[0].targets.length })),
  joints: gltf.skins[0].joints.length,
  licenseFiles: files.slice(1).map(([, file, hash]) => ({ path: file.replace(/^public\//, ''), sha256: hash })),
};
await writeFile(path.join(root, 'src/config/parametricHuman.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Pinned parametric candidate verified: ${manifest.bytes} bytes, ${manifest.morphTargets.length} body targets, ${manifest.joints} joints.`);
