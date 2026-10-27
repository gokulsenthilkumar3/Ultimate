import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Euler, Line3, Matrix4, Triangle, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshBVH } from 'three-mesh-bvh';
import { createParametricIdentity } from '../../src/components/morphEngine/parametricIdentity.js';
import { createParametricAttachments } from '../../src/components/morphEngine/parametricAttachments.js';
import { bakePosedSurface } from '../../src/components/morphEngine/posedGarmentContact.js';
import { createSurfaceContactNormal } from '../../src/components/morphEngine/surfaceContactNormal.js';
import { createBodyCollisionProxies } from '../../src/components/morphEngine/garmentProxyFit.js';
import { classifyGarmentOutsideProxies, garmentAcceptance } from '../../src/components/morphEngine/proxyClassification.js';
export { bakePosedSurface } from '../../src/components/morphEngine/posedGarmentContact.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const basisPath = 'public/assets/models/parametric-base-v1.glb';
const basisHash = '6627588660aa6c754aaa2edb181bc01a8ca60c3b4c534efa3e87f636ce5cda18';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const identityMatrix = new Matrix4();

// These are finite artistic source weights, not calibrated centimetres or a
// demographic/body-population coverage claim. The combinations are explicit.
export const GARMENT_SHAPES = Object.freeze([
  ['neutral', {}], ['shorter', { heightShorter: 0.75 }], ['taller', { heightTaller: 0.75 }],
  ['heavier', { bodyHeavier: 1 }], ['thinner', { bodyThinner: 1 }],
  ['muscular', { bodyMuscular: 1 }], ['softer', { bodySofter: 1 }],
  ['masculine', { bodyMasculine: 1 }], ['feminine', { bodyFeminine: 1 }],
  ['shoulders-wide', { shouldersWider: 1 }], ['shoulders-narrow', { shouldersNarrower: 1 }],
  ['chest-wide', { chestWider: 1 }], ['chest-deep', { chestDeeper: 1 }],
  ['chest-narrow-shallow', { chestNarrower: 0.75, chestShallower: 0.75 }],
  ['bust-large', { bustBigger: 1 }], ['bust-small', { bustSmaller: 1 }],
  ['waist-wide', { waistWider: 1 }], ['waist-narrow', { waistNarrower: 1 }],
  ['belly-large', { bellyBigger: 1 }], ['hips-wide', { hipsWider: 1 }],
  ['hips-narrow', { hipsNarrower: 1 }], ['arms-thick', { armsThicker: 1 }],
  ['arms-thin', { armsThinner: 1 }], ['upper-arms-long', { armsUpperTaller: 0.8 }],
  ['lower-arms-long', { armsLowerTaller: 0.8 }], ['upper-legs-long', { legsUpperLonger: 0.8 }],
  ['lower-legs-long', { legsLowerLonger: 0.8 }],
  ['heavy-wide-combination', { bodyHeavier: 0.8, shouldersWider: 0.65, chestDeeper: 0.6, waistWider: 0.65, armsThicker: 0.6 }],
  ['slim-long-combination', { bodyThinner: 0.65, heightTaller: 0.5, shouldersNarrower: 0.5, waistNarrower: 0.6, armsLonger: 0.4 }],
  ['bust-waist-combination', { bodyFeminine: 0.65, bustBigger: 0.75, waistNarrower: 0.6, hipsWider: 0.65 }],
].map(([id, parameters]) => Object.freeze({ id, parameters: Object.freeze(parameters) })));

// Source bones have identity rest rotations. Values are local XYZ Euler deltas
// in radians; the complete deltas are part of the evidence rather than an
// assertion that these simple rig fixtures are an anatomically validated pose.
export const GARMENT_POSES = Object.freeze([
  { id: 'neutral-a-pose', joints: {} },
  { id: 'arms-raised', joints: { LeftArm: [0, 0, 2], RightArm: [0, 0, -2] } },
  { id: 'forward-reach', joints: { LeftArm: [0, -1.1, 0.7], RightArm: [0, 1.1, -0.7] } },
  { id: 'elbows-flexed', joints: { LeftForeArm: [0, -1.2, 0], RightForeArm: [0, 1.2, 0] } },
  { id: 'torso-flexed', joints: { Spine: [0.4, 0, 0], Spine1: [0.25, 0, 0] } },
]);

function triangleAt(geometry, face, target) {
  const index = geometry.index, position = geometry.attributes.position;
  return target.set(...[0, 1, 2].map(offset => new Vector3().fromBufferAttribute(position, index.getX(face * 3 + offset))));
}

/** Only edge topology classifies the collar/cuff/hem zone; no position-based
 * body-region filter can silently discard a collision with a hand or head. */
export function garmentBoundaryFaces(geometry, originalVertices = null) {
  const index = geometry.index, vertex = id => originalVertices ? originalVertices[id] : id;
  const edges = new Map();
  for (let offset = 0; offset < index.count; offset += 3) {
    const ids = [0, 1, 2].map(i => vertex(index.getX(offset + i)));
    for (let i = 0; i < 3; i++) {
      const a = ids[i], b = ids[(i + 1) % 3];
      const key = a < b ? `${a}/${b}` : `${b}/${a}`;
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  }
  const boundaryVertices = new Set();
  for (const [key, count] of edges) if (count === 1) key.split('/').forEach(id => boundaryVertices.add(Number(id)));
  const faces = new Set();
  for (let offset = 0; offset < index.count; offset += 3) {
    if ([0, 1, 2].some(i => boundaryVertices.has(vertex(index.getX(offset + i))))) faces.add(offset / 3);
  }
  return { faces, vertices: boundaryVertices.size };
}

function classifyBodyFace(body, face) {
  if (!body?.skeleton) return 'unclassified';
  const index = body.geometry.index, ids = body.geometry.attributes.skinIndex, weights = body.geometry.attributes.skinWeight;
  const groups = new Map();
  for (let corner = 0; corner < 3; corner++) for (let component = 0; component < 4; component++) {
    const vertex = index.getX(face * 3 + corner), name = body.skeleton.bones[ids.getComponent(vertex, component)]?.name || '';
    const group = /Head|Neck/i.test(name) ? 'head-neck' : /Hand|Thumb|Index|Middle|Ring|Pinky/i.test(name) ? 'hands-fingers'
      : /Arm|Shoulder/i.test(name) ? 'arms-shoulders' : /Leg|Foot|Toe/i.test(name) ? 'legs-feet' : 'torso-pelvis';
    groups.set(group, (groups.get(group) || 0) + weights.getComponent(vertex, component));
  }
  return [...groups].sort((a, b) => b[1] - a[1])[0]?.[0] || 'unclassified';
}

/** Actual whole-surface intersections plus independently chosen triangle
 * interior samples. Nearest-feature pseudonormals are local surface diagnostics,
 * not a watertight point-in-solid or physiological contact model. */
export function measureGarmentContact(bodyGeometry, garmentGeometry, {
  originalVertices, bodyMesh, minimumGapMetres = 0.002, penetrationToleranceMetres = 0.0005,
} = {}) {
  const bodyBvh = new MeshBVH(bodyGeometry, { indirect: true, maxLeafTris: 8 });
  const contactNormal = createSurfaceContactNormal(bodyGeometry);
  const garmentBvh = new MeshBVH(garmentGeometry, { indirect: true, maxLeafTris: 8 });
  garmentGeometry.boundsTree = garmentBvh;
  const boundary = garmentBoundaryFaces(garmentGeometry, originalVertices);
  const bodyFaces = new Set(), garmentFaces = new Set(), interiorFaces = new Set(), boundaryFaces = new Set();
  const segment = new Line3(), examples = [], regionCounts = {};
  let pairCount = 0, maximumSegmentMetres = 0, pointContacts = 0;
  bodyBvh.bvhcast(garmentBvh, identityMatrix, { intersectsTriangles(bodyTriangle, garmentTriangle, bodyIndex, garmentIndex) {
    if (!bodyTriangle.intersectsTriangle(garmentTriangle, segment)) return false;
    const length = segment.distance();
    // A zero-length touch is still reported, but isn't counted as a proper
    // crossing segment. The independent minimum-gap gate catches contact.
    if (length <= 1e-6) { pointContacts++; return false; }
    const bodyFace = bodyBvh.resolveTriangleIndex(bodyIndex), garmentFace = garmentBvh.resolveTriangleIndex(garmentIndex);
    const zone = boundary.faces.has(garmentFace) ? 'opening-boundary-adjacent' : 'garment-interior';
    const region = classifyBodyFace(bodyMesh, bodyFace);
    pairCount++; bodyFaces.add(bodyFace); garmentFaces.add(garmentFace);
    (zone === 'garment-interior' ? interiorFaces : boundaryFaces).add(garmentFace);
    regionCounts[region] = (regionCounts[region] || 0) + 1;
    maximumSegmentMetres = Math.max(maximumSegmentMetres, length);
    if (examples.length < 12) examples.push({ bodyFace, garmentFace, zone, bodyRegion: region, segmentMm: length * 1000, startMetres: segment.start.toArray(), endMetres: segment.end.toArray() });
    return false;
  } });

  const triangle = new Triangle(), point = new Vector3(), normal = new Vector3(), hit = { point: new Vector3() };
  const barycentric = [[1 / 3, 1 / 3, 1 / 3], [0.5, 0.25, 0.25], [0.25, 0.5, 0.25], [0.25, 0.25, 0.5]];
  let samples = 0, minimumSigned = Infinity, minimumSampleGap = Infinity, penetratingInteriorSamples = 0, penetratingBoundarySamples = 0;
  const sampleExamples = [];
  for (let face = 0; face < garmentGeometry.index.count / 3; face++) {
    triangleAt(garmentGeometry, face, triangle);
    for (const weights of barycentric) {
      point.set(0, 0, 0).addScaledVector(triangle.a, weights[0]).addScaledVector(triangle.b, weights[1]).addScaledVector(triangle.c, weights[2]);
      const closest = bodyBvh.closestPointToPoint(point, hit);
      if (!closest) throw new Error('No body surface matched a garment sample.');
      contactNormal(closest.faceIndex, closest.point, normal);
      const signed = new Vector3().subVectors(point, closest.point).dot(normal);
      minimumSigned = Math.min(minimumSigned, signed); minimumSampleGap = Math.min(minimumSampleGap, closest.distance); samples++;
      if (signed < -penetrationToleranceMetres) {
        const isBoundary = boundary.faces.has(face);
        if (isBoundary) penetratingBoundarySamples++; else penetratingInteriorSamples++;
        if (sampleExamples.length < 12) sampleExamples.push({ garmentFace: face, barycentric: weights, bodyFace: closest.faceIndex, zone: isBoundary ? 'opening-boundary-adjacent' : 'garment-interior', bodyRegion: classifyBodyFace(bodyMesh, closest.faceIndex), signedNearestMm: signed * 1000 });
      }
    }
  }
  const closest = bodyBvh.closestPointToGeometry(garmentGeometry, identityMatrix, {}, {});
  const minimumTriangleGap = closest?.distance ?? null;
  const legacySignedPass = pairCount === 0 && penetratingInteriorSamples === 0 && penetratingBoundarySamples === 0
    && minimumTriangleGap !== null && minimumTriangleGap >= minimumGapMetres;
  const proxyExterior = bodyMesh && !legacySignedPass && pairCount === 0 && minimumTriangleGap >= minimumGapMetres
    ? classifyGarmentOutsideProxies(bodyGeometry, garmentGeometry, createBodyCollisionProxies(bodyMesh, bodyGeometry, 0)) : null;
  const acceptance = garmentAcceptance({ intersectionPairs: pairCount, minimumTriangleGapMm: minimumTriangleGap === null ? null : minimumTriangleGap * 1000,
    minimumRequiredGapMm: minimumGapMetres * 1000, penetratingInteriorSamples, penetratingOpeningBoundarySamples: penetratingBoundarySamples }, proxyExterior);
  return {
    pass: acceptance.pass, legacySignedPass, acceptance, proxyExterior,
    minimumRequiredGapMm: minimumGapMetres * 1000, penetrationToleranceMm: penetrationToleranceMetres * 1000,
    intersectionPairs: pairCount, intersectingBodyTriangles: bodyFaces.size, intersectingGarmentTriangles: garmentFaces.size,
    intersectingInteriorGarmentTriangles: interiorFaces.size, intersectingOpeningBoundaryTriangles: boundaryFaces.size,
    zeroLengthContacts: pointContacts, maximumIntersectionSegmentMm: maximumSegmentMetres * 1000,
    minimumTriangleGapMm: minimumTriangleGap === null ? null : minimumTriangleGap * 1000,
    independentInteriorSamples: samples, minimumSampleGapMm: minimumSampleGap * 1000,
    minimumSignedNearestMm: minimumSigned * 1000, penetratingInteriorSamples, penetratingOpeningBoundarySamples: penetratingBoundarySamples,
    openingBoundaryVertices: boundary.vertices, intersectedBodyRegions: regionCounts,
    intersectionExamples: examples, sampleExamples,
  };
}

export async function runGarmentMatrix({ limit = 150, progress = () => {} } = {}) {
  const basis = await readFile(path.join(root, basisPath));
  if (sha(basis) !== basisHash) throw new Error('The garment matrix requires the pinned canonical basis.');
  const attachmentManifest = JSON.parse(await readFile(path.join(root, 'public/assets/parametric/attachments/manifest.json'), 'utf8'));
  const data = await Promise.all(['short02', 'tee'].map(async name => {
    const entry = attachmentManifest.assets[name], bytes = await readFile(path.join(root, 'public/assets/parametric/attachments', entry.file));
    if (sha(bytes) !== entry.sha256) throw new Error(`The ${name} correspondence differs from its manifest.`);
    return { data: JSON.parse(bytes) };
  }));
  const source = (await new GLTFLoader().parseAsync(basis.buffer.slice(basis.byteOffset, basis.byteOffset + basis.byteLength), '')).scene;
  const sourceBody = source.getObjectByName('Body');
  const sourcePositions = sha(Buffer.from(sourceBody.geometry.attributes.position.array.buffer));
  const originalBones = sourceBody.skeleton.bones.map(bone => ({ name: bone.name, position: bone.position.toArray(), quaternion: bone.quaternion.toArray(), scale: bone.scale.toArray() }));
  const supportedNames = new Set(Object.keys(sourceBody.morphTargetDictionary));
  for (const shape of GARMENT_SHAPES) for (const [name, weight] of Object.entries(shape.parameters)) {
    if (!supportedNames.has(name) || !(weight >= 0 && weight <= 1)) throw new Error(`Unsupported garment fixture: ${shape.id}/${name}.`);
  }
  const identity = createParametricIdentity(source), body = identity.scene.getObjectByName('Body');
  const attachments = createParametricAttachments(body, { hair: data[0], garment: data[1] });
  const garment = attachments.meshes.find(mesh => mesh.userData.authoredAttachment === 'tee');
  const garmentData = attachments.records.find(record => record.mesh === garment).data;
  const rest = body.skeleton.bones.map(bone => ({ bone, position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone() }));
  const cases = [], started = performance.now();
  try {
    for (const shape of GARMENT_SHAPES) {
      for (const saved of rest) { saved.bone.quaternion.copy(saved.quaternion); saved.bone.scale.copy(saved.scale); }
      identity.setWeights(shape.parameters); attachments.update();
      for (const pose of GARMENT_POSES) {
        if (cases.length >= limit) break;
        for (const saved of rest) { saved.bone.quaternion.copy(saved.quaternion); saved.bone.scale.copy(saved.scale); }
        for (const [name, angles] of Object.entries(pose.joints)) {
          const bone = body.skeleton.bones.find(bone => bone.name.replace(/^mixamorig:?/, '') === name);
          if (!bone) throw new Error(`The canonical rig is missing fixture joint ${name}.`);
          bone.quaternion.multiply(new (bone.quaternion.constructor)().setFromEuler(new Euler(...angles, 'XYZ')));
        }
        identity.scene.updateMatrixWorld(true); body.skeleton.update(); attachments.update();
        const bodyGeometry = bakePosedSurface(body), garmentGeometry = bakePosedSurface(garment);
        try {
          cases.push({ id: `${shape.id}/${pose.id}`, shape: shape.id, parameters: shape.parameters, pose: pose.id,
            contactFit: garment.userData.contactFit,
            ...measureGarmentContact(bodyGeometry, garmentGeometry, { originalVertices: garmentData.originalVertices, bodyMesh: body }) });
        } finally { bodyGeometry.dispose(); garmentGeometry.dispose(); }
      }
      progress({ shape: shape.id, completed: cases.length, passed: cases.filter(result => result.pass).length });
      if (cases.length >= limit) break;
    }
  } finally { attachments.dispose(); identity.dispose(); }
  const afterBones = sourceBody.skeleton.bones.map(bone => ({ name: bone.name, position: bone.position.toArray(), quaternion: bone.quaternion.toArray(), scale: bone.scale.toArray() }));
  if (sourcePositions !== sha(Buffer.from(sourceBody.geometry.attributes.position.array.buffer)) || JSON.stringify(originalBones) !== JSON.stringify(afterBones)) throw new Error('The matrix changed the shared source basis.');
  const passed = cases.filter(result => result.pass).length;
  return {
    format: 'growthtrack-garment-fitting-matrix', version: 2, generatedAt: new Date().toISOString(), basisPath, basisSha256: basisHash,
    attachmentSha256: attachmentManifest.assets.tee.sha256,
    complete: cases.length === 150, expectedCases: 150, evaluatedCases: cases.length, passedCases: passed, failedCases: cases.length - passed,
    productionGatePass: cases.length === 150 && passed === 150,
    durationMs: performance.now() - started, shapeConfigurations: GARMENT_SHAPES, poseFixtures: GARMENT_POSES,
    method: {
      surfaceIntersection: 'BVH-accelerated full posed triangle/triangle crossings; >1 micrometre segment counted',
      interiorSampling: 'centroid plus three quarter barycentric points of EVERY garment triangle; independent nearest posed body triangle',
      signedContact: 'face normal at triangle interiors; summed incident normals at welded edges; angle-weighted incident normals at welded vertices',
      signedDisagreement: 'negative local signs can pass only with independent whole-triangle exterior certification against closed body-enclosing convex parts; crossings and global gap remain hard gates',
      minimumGap: 'global posed triangle-surface closest distance, required >=2 mm',
      openingClassification: 'weld authored UV-seam vertices by original index; faces incident to open boundary reported separately; never silently excluded',
      skinRegionClassification: 'dominant canonical bone-weight region at intersected body face; hands/head contacts remain reported',
      units: 'geometry metres; reported clearances millimetres',
    },
    limits: [
      'Finite deterministic source weights and joint deltas, not all bodies, motions, cloth dynamics or anatomically certified poses.',
      'Rest joints follow source-surface displacement; this is geometric proportion fitting, not calibrated anatomical joint reconstruction.',
      'Signed nearest-feature distances are local surface diagnostics, not guaranteed point-in-solid classification for an open or self-intersecting body.',
      'The 2 mm clearance is an explicit engineering test threshold, not an artist-approved cloth-ease requirement.',
      'Any failed case keeps the production garment gate open; numerical completion is not visual acceptance.',
    ],
    sourceUnchanged: true, cases,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), strict = args.includes('--strict');
  if (args.some(arg => arg !== '--strict' && !/^--limit=\d+$/.test(arg))) throw new Error('Usage: review-garment-matrix.mjs [--strict] [--limit=1..150]');
  const limitArg = args.find(arg => arg.startsWith('--limit=')), limit = limitArg ? Number(limitArg.split('=')[1]) : 150;
  if (!Number.isInteger(limit) || limit < 1 || limit > 150) throw new Error('The matrix limit must be 1..150.');
  const report = await runGarmentMatrix({ limit, progress: value => console.log(JSON.stringify(value)) });
  const directory = path.join(root, 'artifacts/parametric-portrait');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, limit === 150 ? 'garment-matrix.json' : 'garment-matrix-partial.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ complete: report.complete, evaluated: report.evaluatedCases, passed: report.passedCases, failed: report.failedCases, productionGatePass: report.productionGatePass, durationMs: report.durationMs }));
  if (strict && !report.productionGatePass) process.exitCode = 1;
}
