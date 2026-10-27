import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Box3, Euler, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createParametricIdentity } from '../../src/components/morphEngine/parametricIdentity.js';
import { createParametricAttachments } from '../../src/components/morphEngine/parametricAttachments.js';
import { createBoneCollisionProxies } from '../../src/components/morphEngine/boneCollisionProxies.js';
import { bodyTriangleRegions, createBodyCollisionProxies } from '../../src/components/morphEngine/garmentProxyFit.js';
import { classifyAnalyticExterior, fitAnalyticGarmentColliders } from '../../src/components/morphEngine/analyticGarmentColliders.js';
import { createGeodesicGarmentProjection } from '../../src/components/morphEngine/geodesicGarmentProjection.js';
import { bakePosedSurface, prepareGarmentContact } from '../../src/components/morphEngine/posedGarmentContact.js';
import { garmentAcceptance } from '../../src/components/morphEngine/proxyClassification.js';
import { measureBodySelfContact } from './body-self-contact.mjs';
import { GARMENT_POSES, GARMENT_SHAPES, measureGarmentContact } from './review-garment-matrix.mjs';

const args = process.argv.slice(2);
if (args.some(arg => !['--hybrid', '--geodesic', '--strict'].includes(arg))) throw new Error('Usage: review-analytic-colliders.mjs [--hybrid] [--geodesic] [--strict]');
const hybrid = args.includes('--hybrid'), geodesic = args.includes('--geodesic');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const basis = await readFile(path.join(root, 'public/assets/models/parametric-base-v1.glb'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const basisSha256 = hash(basis);
if (basisSha256 !== '6627588660aa6c754aaa2edb181bc01a8ca60c3b4c534efa3e87f636ce5cda18') throw new Error('Unexpected source basis.');
const source = (await new GLTFLoader().parseAsync(basis.buffer.slice(basis.byteOffset, basis.byteOffset + basis.byteLength), '')).scene;
const sourceBody = source.getObjectByName('Body');
const sourceState = () => JSON.stringify({ positions: hash(Buffer.from(sourceBody.geometry.attributes.position.array.buffer)),
  bones: sourceBody.skeleton.bones.map(bone => [bone.position.toArray(), bone.quaternion.toArray(), bone.scale.toArray()]) });
const originalSource = sourceState();
const data = JSON.parse(await readFile(path.join(root, 'public/assets/parametric/attachments/tee.json'), 'utf8'));
const cases = [];
const appendage = name => /hand|thumb|index|middle|ring|pinky|forearm/.test(name);

function collidersFor(body, geometry, clearance) {
  const bones = createBoneCollisionProxies(body, geometry, clearance, { analytic: true });
  if (!hybrid) return bones;
  const limbs = bones.filter(collider => appendage(collider.region));
  const limbFaces = new Set(limbs.flatMap(collider => collider.sourceFaces));
  const regions = bodyTriangleRegions(body).map((region, face) => limbFaces.has(face) ? 'analytic-appendages' : region);
  const rest = createBodyCollisionProxies(regions, geometry, clearance).filter(collider => collider.region !== 'analytic-appendages');
  // Offset convex planes may extend beyond an expanded source-point AABB.
  for (const collider of rest) collider.bounds = new Box3(new Vector3(-Infinity, -Infinity, -Infinity), new Vector3(Infinity, Infinity, Infinity));
  return [...rest, ...limbs];
}

for (const [shapeId, poseId] of [['neutral', 'neutral-a-pose'], ['waist-wide', 'torso-flexed'], ['heavy-wide-combination', 'torso-flexed'], ['belly-large', 'elbows-flexed']]) {
  const identity = createParametricIdentity(source), body = identity.scene.getObjectByName('Body');
  let attachments, restBody, restGarment, bodyGeometry, garmentGeometry;
  try {
    identity.setWeights(GARMENT_SHAPES.find(shape => shape.id === shapeId).parameters);
    attachments = createParametricAttachments(body, { garment: { data } }, { contactCorrection: false });
    const garment = attachments.meshes[0];
    restBody = bakePosedSurface(body); restGarment = bakePosedSurface(garment);
    const projection = geodesic ? createGeodesicGarmentProjection(restBody, restGarment, data) : null;
    for (const [name, angles] of Object.entries(GARMENT_POSES.find(pose => pose.id === poseId).joints)) {
      const bone = body.skeleton.bones.find(bone => bone.name.replace(/^mixamorig:?/, '') === name);
      bone.quaternion.multiply(new (bone.quaternion.constructor)().setFromEuler(new Euler(...angles)));
    }
    identity.scene.updateMatrixWorld(true); body.skeleton.update();
    bodyGeometry = bakePosedSurface(body); garmentGeometry = bakePosedSurface(garment);
    const authored = garmentGeometry.attributes.position.array.slice();
    const bodySelf = measureBodySelfContact(bodyGeometry), regions = bodyTriangleRegions(body);
    bodySelf.appendageTorsoCrossingPairs = bodySelf.pairs.filter(pair => {
      const [a, b] = pair.split('/').map(face => regions[Number(face)]);
      return (appendage(a) && /spine|pelvis|chest/.test(b)) || (appendage(b) && /spine|pelvis|chest/.test(a));
    }).length;
    bodySelf.handTorsoCrossingPairs = bodySelf.pairs.filter(pair => {
      const [a, b] = pair.split('/').map(face => regions[Number(face)]);
      const hand = name => /hand|thumb|index|middle|ring|pinky/.test(name);
      return (hand(a) && /spine|pelvis|chest/.test(b)) || (hand(b) && /spine|pelvis|chest/.test(a));
    }).length;
    delete bodySelf.pairs;
    const { payload } = prepareGarmentContact(body, garment, data);
    const colliderStart = performance.now(), colliders = collidersFor(body, bodyGeometry, 0.003);
    const colliderConstructionMs = performance.now() - colliderStart;
    const projectionSamples = [];
    let projectionContact = null, maximumWarmDifferenceMetres = 0, firstProjected;
    if (projection) {
      for (let sample = 0; sample < 6; sample++) {
        garmentGeometry.attributes.position.array.set(authored);
        projectionSamples.push(projection.project(bodyGeometry, garmentGeometry));
        if (!firstProjected) firstProjected = garmentGeometry.attributes.position.array.slice();
        else for (let value = 0; value < firstProjected.length; value++) maximumWarmDifferenceMetres = Math.max(maximumWarmDifferenceMetres,
          Math.abs(firstProjected[value] - garmentGeometry.attributes.position.array[value]));
      }
      projectionContact = measureGarmentContact(bodyGeometry, garmentGeometry, { originalVertices: data.originalVertices, bodyMesh: body });
    }
    const fit = fitAnalyticGarmentColliders(colliders, garmentGeometry, {
      originalVertices: data.originalVertices, outwardNormals: payload.outwardNormals, referencePositions: authored,
    });
    const verificationStart = performance.now();
    const contact = measureGarmentContact(bodyGeometry, garmentGeometry, { originalVertices: data.originalVertices, bodyMesh: body });
    const classification = classifyAnalyticExterior(bodyGeometry, garmentGeometry, collidersFor(body, bodyGeometry, 0));
    const acceptance = garmentAcceptance(contact, classification);
    acceptance.displacementWithinBound = fit.maximumDisplacementMetres <= 0.0800001;
    acceptance.pass &&= acceptance.displacementWithinBound;
    const record = { id: `${shapeId}/${poseId}`, bodySelf, colliderConstructionMs,
      colliders: colliders.map(({ region, kind, bone, radius, dimensions, start, end }) => ({ region, kind: kind || 'convex-part', bone, radius, dimensions, start, end })),
      projectionSamples, maximumWarmDifferenceMetres, projectionContact, fit, contact, classification, acceptance,
      verificationMs: performance.now() - verificationStart,
      firstFitMs: colliderConstructionMs + (projectionSamples[0]?.projectionMs || 0) + fit.durationMs };
    cases.push(record);
    console.log(JSON.stringify({ id: record.id, accepted: acceptance.pass, bodyCrossings: bodySelf.nonadjacentCrossingPairs,
      handTorsoCrossings: bodySelf.handTorsoCrossingPairs, garmentCrossings: contact.intersectionPairs,
      minimumGapMm: contact.minimumTriangleGapMm, colliderContacts: classification.contactPairs, fitMs: fit.durationMs }));
  } finally { restBody?.dispose(); restGarment?.dispose(); bodyGeometry?.dispose(); garmentGeometry?.dispose(); attachments?.dispose(); identity.dispose(); }
}
if (originalSource !== sourceState()) throw new Error('The candidate changed shared source geometry or joints.');
const report = { format: 'growthtrack-analytic-capsule-review', version: 1, generatedAt: new Date().toISOString(), basisSha256,
  candidate: `${hybrid ? 'convex-torso-analytic-appendages' : 'bone-boxes-and-analytic-capsules'}${geodesic ? '-with-graph-geodesic' : ''}`,
  usedInRuntime: false, fullMatrixAcceptance: false, visualAcceptance: false, sourceUnchanged: true,
  evaluatedCases: cases.length, passedCases: cases.filter(record => record.acceptance.pass).length,
  constraints: { minimumGapMm: 2, maximumDisplacementMm: 80, fitColliderExpansionMm: 3, noSourceTrianglesExcluded: true },
  timingScope: 'Node CPU samples; firstFitMs includes collider construction, first projection and contact fit; excludes reference preparation and independent verification. Cached projection samples reset the garment to identical input and do not represent complete frame costs.',
  cases };
await mkdir(path.join(root, 'artifacts/parametric-portrait'), { recursive: true });
await writeFile(path.join(root, `artifacts/parametric-portrait/garment-${hybrid ? 'hybrid' : 'analytic'}-capsules${geodesic ? '-geodesic' : ''}.json`), JSON.stringify(report, null, 2));
if (args.includes('--strict') && cases.some(record => !record.acceptance.pass)) process.exitCode = 1;
