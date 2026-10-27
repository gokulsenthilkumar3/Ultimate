import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Preserve the authored source bitmap byte for byte. Geometry and its atlas
// coordinates are authored by parametricEyes.js; this does not edit the image.
const out = 'public/assets/parametric/eyes';
const source = '.tmp/makehuman-cc0-assets/eyes/materials/brown_eye.png';
const expected = '4659691c7295ad6206c78b003e5fd0e5f91dcd53032fa914a229bb48cabe424b';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = await readFile(source);
if (sha(bytes) !== expected || bytes.readUInt32BE(16) !== 1024 || bytes.readUInt32BE(20) !== 1024) throw new Error('The pinned CC0 eye atlas changed.');
await mkdir(out, { recursive: true });
await writeFile(`${out}/eye-albedo.png`, bytes);
const notices = {
  'EYES-CC0.txt': await readFile('public/assets/parametric/skin/SKIN-CC0.txt'),
  'EYES-MATERIAL.txt': await readFile('.tmp/makehuman-cc0-assets/eyes/materials/brown.mhmat'),
  'EYES-SOURCE.md': Buffer.from('# Canonical eye study\n\n'
    + 'Authored eye albedo copied unchanged from MakeHuman system CC0 assets, eyes/materials/brown_eye.png.\n'
    + 'Pinned archive SHA-256: b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107.\n'
    + 'Source atlas SHA-256: ' + expected + '. Source material CC0 header and universal notice accompany this file.\n\n'
    + 'Generated geometry: two smooth sclera shells with an iris aperture, recessed iris/pupil and separate convex corneal cap, fitted to the pinned canonical eye mesh bounds.\n'
    + 'Optics: Three.js MeshPhysicalMaterial transmission with effective IOR 1.336. Geometry depth and IOR are project tuning, not a calibrated anatomical eye model.\n'
    + 'No copied Unreal assets/code. Reference: https://dev.epicgames.com/documentation/en-us/unreal-engine/photorealistic-character?application_version=4.27 and https://threejs.org/docs/pages/MeshPhysicalMaterial.html .\n\n'
    + 'Limits: no tearline, tear film, spectral dispersion, measured eye biometry, caustic transport, dynamic pupil response or expression contact certification.\n'),
};
for (const [name, contents] of Object.entries(notices)) await writeFile(`${out}/${name}`, contents);
const manifest = {
  version: 1, basisSha256: '6627588660aa6c754aaa2edb181bc01a8ca60c3b4c534efa3e87f636ce5cda18',
  source, sourceArchiveSha256: 'b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107',
  license: 'CC0-1.0',
  albedo: { file: 'eye-albedo.png', sha256: expected, bytes: bytes.length, width: 1024, height: 1024, colorSpace: 'srgb', flipY: false },
  atlas: { left: [0.708, 0.298], right: [0.293, 0.710], irisRadius: 0.111, scleraRadius: 0.278 },
  optics: { model: 'layered-native-transmission-v1', effectiveIor: 1.336, corneaThicknessMetres: 0.0025, physiologicalCalibration: false },
  licenseFiles: Object.entries(notices).map(([file, contents]) => ({ file, sha256: sha(contents), bytes: contents.length })),
};
await writeFile(`${out}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ bytes: bytes.length, hash: expected, notices: manifest.licenseFiles.length }));
