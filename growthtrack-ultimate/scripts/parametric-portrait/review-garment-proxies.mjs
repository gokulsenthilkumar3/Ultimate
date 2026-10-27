import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Euler } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createParametricIdentity } from '../../src/components/morphEngine/parametricIdentity.js';
import { createParametricAttachments } from '../../src/components/morphEngine/parametricAttachments.js';
import { createBodyCollisionProxies, fitGarmentProxies } from '../../src/components/morphEngine/garmentProxyFit.js';
import { bakePosedSurface, prepareGarmentContact } from '../../src/components/morphEngine/posedGarmentContact.js';
import { GARMENT_SHAPES, GARMENT_POSES, measureGarmentContact } from './review-garment-matrix.mjs';

// Experimental comparison only: the live worker does NOT use this candidate.
// Source triangle crossings, signed samples, 2 mm gap and 80 mm displacement
// remain the acceptance checks even when all proxy constraints are satisfied.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fixtures = [['neutral', 'neutral-a-pose'], ['waist-wide', 'torso-flexed'],
  ['heavy-wide-combination', 'torso-flexed'], ['belly-large', 'elbows-flexed']];
const bytes = await readFile(path.join(root, 'public/assets/models/parametric-base-v1.glb'));
const basisSha256 = createHash('sha256').update(bytes).digest('hex');
if (basisSha256 !== '6627588660aa6c754aaa2edb181bc01a8ca60c3b4c534efa3e87f636ce5cda18') throw new Error('The proxy experiment requires the pinned source.');
const source = (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
const teeBytes = await readFile(path.join(root, 'public/assets/parametric/attachments/tee.json'));
const manifest = JSON.parse(await readFile(path.join(root, 'public/assets/parametric/attachments/manifest.json'), 'utf8'));
const attachmentSha256 = createHash('sha256').update(teeBytes).digest('hex');
if (attachmentSha256 !== manifest.assets.tee.sha256) throw new Error('The tee correspondence differs from its manifest.');
const data = JSON.parse(teeBytes), cases = [];
for (const [shapeId, poseId] of fixtures) {
  const identity = createParametricIdentity(source), body = identity.scene.getObjectByName('Body');
  let attachments, bodyGeometry, garmentGeometry;
  try {
    const shape = GARMENT_SHAPES.find(shape => shape.id === shapeId), pose = GARMENT_POSES.find(pose => pose.id === poseId);
    identity.setWeights(shape.parameters);
    attachments = createParametricAttachments(body, { garment: { data } }, { contactCorrection: false });
    const garment = attachments.meshes[0];
    for (const [name, angles] of Object.entries(pose.joints)) {
      const bone = body.skeleton.bones.find(bone => bone.name.replace(/^mixamorig:?/, '') === name);
      bone.quaternion.multiply(new (bone.quaternion.constructor)().setFromEuler(new Euler(...angles, 'XYZ')));
    }
    identity.scene.updateMatrixWorld(true); body.skeleton.update();
    bodyGeometry = bakePosedSurface(body); garmentGeometry = bakePosedSurface(garment);
    const initial = garmentGeometry.attributes.position.array.slice();
    const { payload } = prepareGarmentContact(body, garment, data);
    const started = performance.now(), proxies = createBodyCollisionProxies(body, bodyGeometry, 0.003);
    const proxyConstructionMs = performance.now() - started;
    const result = fitGarmentProxies(proxies, garmentGeometry, { originalVertices: data.originalVertices, outwardNormals: payload.outwardNormals });
    const contact = measureGarmentContact(bodyGeometry, garmentGeometry, { originalVertices: data.originalVertices, bodyMesh: body });
    let maximumDisplacementMetres = 0;
    const actual = garmentGeometry.attributes.position.array;
    for (let vertex = 0; vertex < actual.length / 3; vertex++) maximumDisplacementMetres = Math.max(maximumDisplacementMetres,
      Math.hypot(...[0, 1, 2].map(axis => actual[vertex * 3 + axis] - initial[vertex * 3 + axis])));
    const pass = contact.pass && maximumDisplacementMetres <= 0.0800001;
    cases.push({ id: `${shapeId}/${poseId}`, proxyConstructionMs, result, maximumDisplacementMetres, contact, pass });
    console.log(JSON.stringify({ id: cases.at(-1).id, pass, intersections: contact.intersectionPairs, gapMm: contact.minimumTriangleGapMm }));
  } finally { bodyGeometry?.dispose(); garmentGeometry?.dispose(); attachments?.dispose(); identity.dispose(); }
}
const report = { generatedAt: new Date().toISOString(), basisSha256, attachmentSha256, experiment: 'expanded-convex-parts-with-separate-hands-and-fingers',
  usedInRuntime: false, fullMatrixAcceptance: false, passedCases: cases.filter(result => result.pass).length, evaluatedCases: cases.length,
  limits: ['This is a candidate comparison, not a replacement for the 150-case matrix.',
    'Proxy separation does not override signed source-surface diagnostics or global triangle clearance.',
    'Convex parts can overconstrain the space between hands and torso; a failed fit is not proof of infeasibility.'], cases };
const directory = path.join(root, 'artifacts/parametric-portrait');
await mkdir(directory, { recursive: true });
await writeFile(path.join(directory, 'garment-proxy-experiment.json'), JSON.stringify(report, null, 2));
if (process.argv.includes('--strict') && report.passedCases !== report.evaluatedCases) process.exitCode = 1;
