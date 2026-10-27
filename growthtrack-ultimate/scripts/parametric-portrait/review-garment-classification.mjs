import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Euler } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createParametricIdentity } from '../../src/components/morphEngine/parametricIdentity.js';
import { createParametricAttachments } from '../../src/components/morphEngine/parametricAttachments.js';
import { createBodyCollisionProxies, fitGarmentProxies } from '../../src/components/morphEngine/garmentProxyFit.js';
import { createBoneCollisionProxies } from '../../src/components/morphEngine/boneCollisionProxies.js';
import { createGeodesicGarmentProjection } from '../../src/components/morphEngine/geodesicGarmentProjection.js';
import { bakePosedSurface, prepareGarmentContact } from '../../src/components/morphEngine/posedGarmentContact.js';
import { classifyGarmentOutsideProxies, garmentAcceptance } from '../../src/components/morphEngine/proxyClassification.js';
import { measureBodySelfContact } from './body-self-contact.mjs';
import { GARMENT_SHAPES, GARMENT_POSES, measureGarmentContact } from './review-garment-matrix.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const bytes = await readFile(path.join(root, 'public/assets/models/parametric-base-v1.glb'));
const basisSha256 = createHash('sha256').update(bytes).digest('hex');
if (basisSha256 !== '6627588660aa6c754aaa2edb181bc01a8ca60c3b4c534efa3e87f636ce5cda18') throw new Error('Unexpected source basis.');
const source = (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
const data = JSON.parse(await readFile(path.join(root, 'public/assets/parametric/attachments/tee.json'), 'utf8'));
const fixtures = [['neutral', 'neutral-a-pose'], ['waist-wide', 'torso-flexed'], ['heavy-wide-combination', 'torso-flexed'], ['belly-large', 'elbows-flexed']];
const cases = [];
const boneColliders = process.argv.includes('--bone-colliders');
const geodesic = process.argv.includes('--geodesic');
if (boneColliders && geodesic) throw new Error('Choose one candidate: --bone-colliders or --geodesic.');
for (const [shapeId, poseId] of fixtures) {
  const identity = createParametricIdentity(source), body = identity.scene.getObjectByName('Body');
  let attachments, bodyGeometry, garmentGeometry, restGeometry, restGarment;
  try {
    identity.setWeights(GARMENT_SHAPES.find(shape => shape.id === shapeId).parameters);
    attachments = createParametricAttachments(body, { garment: { data } }, { contactCorrection: false });
    restGeometry = bakePosedSurface(body);
    restGarment = bakePosedSurface(attachments.meshes[0]);
    const projection = geodesic ? createGeodesicGarmentProjection(restGeometry, restGarment, data) : null;
    const restSelf = measureBodySelfContact(restGeometry), restPairs = new Set(restSelf.pairs);
    for (const [name, angles] of Object.entries(GARMENT_POSES.find(pose => pose.id === poseId).joints)) {
      const bone = body.skeleton.bones.find(bone => bone.name.replace(/^mixamorig:?/, '') === name);
      bone.quaternion.multiply(new (bone.quaternion.constructor)().setFromEuler(new Euler(...angles)));
    }
    identity.scene.updateMatrixWorld(true); body.skeleton.update();
    const garment = attachments.meshes[0];
    bodyGeometry = bakePosedSurface(body); garmentGeometry = bakePosedSurface(garment);
    const authoredPositions = garmentGeometry.attributes.position.array.slice();
    const bodySelf = measureBodySelfContact(bodyGeometry);
    bodySelf.poseInducedCrossingPairs = bodySelf.pairs.filter(pair => !restPairs.has(pair)).length;
    delete bodySelf.pairs; delete restSelf.pairs;
    const { payload } = prepareGarmentContact(body, garment, data);
    const proxies = boneColliders ? createBoneCollisionProxies(body, bodyGeometry, 0.003) : createBodyCollisionProxies(body, bodyGeometry, 0.003);
    let result = projection ? projection.project(bodyGeometry, garmentGeometry)
      : fitGarmentProxies(proxies, garmentGeometry, { originalVertices: data.originalVertices, outwardNormals: payload.outwardNormals });
    if (projection) {
      const projectionContact = measureGarmentContact(bodyGeometry, garmentGeometry, { originalVertices: data.originalVertices, bodyMesh: body });
      const started = performance.now();
      const collision = fitGarmentProxies(proxies, garmentGeometry, { originalVertices: data.originalVertices, outwardNormals: payload.outwardNormals, referencePositions: authoredPositions });
      const contactMs = performance.now() - started;
      result = { ...result, projectionContact, collision, contactMs,
        totalSolveMs: result.projectionMs + contactMs };
    }
    const contact = measureGarmentContact(bodyGeometry, garmentGeometry, { originalVertices: data.originalVertices, bodyMesh: body });
    const classification = classifyGarmentOutsideProxies(bodyGeometry, garmentGeometry,
      boneColliders ? createBoneCollisionProxies(body, bodyGeometry, 0) : createBodyCollisionProxies(body, bodyGeometry, 0));
    const acceptance = garmentAcceptance(contact, classification);
    const crossed = new Set(bodySelf.faceIndices);
    const signedSampleFacesAlsoSelfIntersect = contact.sampleExamples.filter(sample => crossed.has(sample.bodyFace)).length;
    const colliders = proxies.map(({ region, bone, kind, dimensions, radius, start, end }) => ({ region, bone, kind, dimensions, radius, start, end }));
    const fitted = garmentGeometry.attributes.position.array;
    let maximumDisplacementMetres = 0;
    for (let vertex = 0; vertex < fitted.length / 3; vertex++) maximumDisplacementMetres = Math.max(maximumDisplacementMetres,
      Math.hypot(...[0, 1, 2].map(axis => fitted[vertex * 3 + axis] - authoredPositions[vertex * 3 + axis])));
    acceptance.displacementWithinBound = maximumDisplacementMetres <= 0.0800001;
    acceptance.pass &&= acceptance.displacementWithinBound;
    const record = { id: `${shapeId}/${poseId}`, result, maximumDisplacementMetres, colliders, bodySelf, restSelf, signedSampleFacesAlsoSelfIntersect, contact, classification, acceptance };
    cases.push(record);
    console.log(JSON.stringify({ id: record.id, outside: classification.outsideProxy, proxyContacts: classification.contactPairs,
      bodyCrossings: bodySelf.nonadjacentCrossingPairs, newBodyCrossings: bodySelf.poseInducedCrossingPairs, accepted: acceptance.pass }));
  } finally { restGarment?.dispose(); restGeometry?.dispose(); bodyGeometry?.dispose(); garmentGeometry?.dispose(); attachments?.dispose(); identity.dispose(); }
}
if (createHash('sha256').update(await readFile(path.join(root, 'public/assets/models/parametric-base-v1.glb'))).digest('hex') !== basisSha256) throw new Error('The source basis changed during the experiment.');
const report = { format: 'growthtrack-garment-candidate-review', version: 2, generatedAt: new Date().toISOString(), basisSha256,
  method: 'separate-body-self-contact-and-conservative-proxy-exterior',
  candidate: geodesic ? 'graph-geodesic-with-convex-contact' : boneColliders ? 'bone-boxes-and-capsule-support-polyhedra' : 'expanded-convex-body-parts',
  evaluatedCases: cases.length, passedCases: cases.filter(record => record.acceptance.pass).length,
  sourceFileUnchanged: true, usedInRuntime: !boneColliders && !geodesic,
  runtimeUse: !boneColliders && !geodesic ? 'certified-fallback-after-two-surface-contact-attempts' : 'offline-experiment-only',
  fullMatrixAcceptance: false, visualAcceptance: false,
  timingScope: 'single Node CPU samples; geodesic totalSolveMs includes fields, projection, relaxation and contact fitting, but excludes preparation, proxy construction and independent verification',
  cases };
await mkdir(path.join(root, 'artifacts/parametric-portrait'), { recursive: true });
await writeFile(path.join(root, `artifacts/parametric-portrait/${geodesic ? 'garment-geodesic-projection' : boneColliders ? 'garment-bone-colliders' : 'garment-classification'}.json`), JSON.stringify(report, null, 2));
if (process.argv.includes('--strict') && cases.some(record => !record.acceptance.pass)) process.exitCode = 1;
