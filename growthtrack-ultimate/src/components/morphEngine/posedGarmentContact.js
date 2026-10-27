import { BufferAttribute, BufferGeometry, Matrix3, Matrix4, Vector3 } from 'three';
import { fitGarmentContact } from './garmentContactFit.js';
import { MeshBVH } from 'three-mesh-bvh';
import { bodyTriangleRegions, createBodyCollisionProxies, fitGarmentProxies } from './garmentProxyFit.js';
import { classifyGarmentOutsideProxies } from './proxyClassification.js';

/** Owned geometry in world metres, including the current bone deformation. */
export function bakePosedSurface(mesh) {
  const points = mesh.geometry.attributes.position, values = new Float32Array(points.count * 3), vertex = new Vector3();
  mesh.updateWorldMatrix(true, false);
  for (let index = 0; index < points.count; index++) {
    vertex.fromBufferAttribute(points, index);
    if (mesh.isSkinnedMesh) mesh.applyBoneTransform(index, vertex);
    vertex.applyMatrix4(mesh.matrixWorld).toArray(values, index * 3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(values, 3));
  geometry.setIndex(mesh.geometry.index.clone());
  geometry.computeVertexNormals();
  return geometry;
}

/** Correct actual posed surfaces, then map the correction back through each
 * vertex's blended skin transform. Export and rendering use the same result. */
export function prepareGarmentContact(body, garment, data) {
  const bodyGeometry = bakePosedSurface(body), garmentGeometry = bakePosedSurface(garment);
  try {
    const points = garment.geometry.attributes.position;
    const ids = garment.geometry.attributes.skinIndex, weights = garment.geometry.attributes.skinWeight;
    const blend = new Matrix4(), boneMatrix = new Matrix4(), transform = new Matrix4(), point = new Vector3();
    const normalMatrix = new Matrix3(), outward = new Float32Array(points.count * 3), inverseTransforms = [];
    for (let vertex = 0; vertex < points.count; vertex++) {
      blend.elements.fill(0);
      for (let component = 0; component < 4; component++) {
        const weight = weights.getComponent(vertex, component);
        if (!weight) continue;
        const bone = ids.getComponent(vertex, component);
        boneMatrix.multiplyMatrices(garment.skeleton.bones[bone].matrixWorld, garment.skeleton.boneInverses[bone]);
        for (let element = 0; element < 16; element++) blend.elements[element] += boneMatrix.elements[element] * weight;
      }
      transform.copy(garment.matrixWorld).multiply(garment.bindMatrixInverse).multiply(blend).multiply(garment.bindMatrix);
      if (Math.abs(transform.determinant()) < 1e-10) throw new Error('The garment pose has a singular skin transform.');
      const binding = data.clearanceBindings[vertex], normals = body.geometry.attributes.normal;
      point.set(0, 0, 0);
      for (let corner = 0; corner < binding.indices.length; corner++) point.addScaledVector(new Vector3().fromBufferAttribute(normals, binding.indices[corner]), binding.weights[corner]);
      point.applyMatrix3(normalMatrix.getNormalMatrix(transform)).normalize().toArray(outward, vertex * 3);
      inverseTransforms.push(transform.clone().invert());
    }
    return {
      payload: { bodyPositions: bodyGeometry.attributes.position.array, bodyIndices: bodyGeometry.index.array,
        garmentPositions: garmentGeometry.attributes.position.array, garmentIndices: garmentGeometry.index.array,
        originalVertices: data.originalVertices, outwardNormals: outward, bodyRegions: bodyTriangleRegions(body) },
      apply(values) {
        if (values.length !== points.array.length || !values.every(Number.isFinite)) throw new Error('The garment contact correction produced invalid positions.');
        const corrected = new Float32Array(values.length);
        for (let vertex = 0; vertex < points.count; vertex++) point.fromArray(values, vertex * 3).applyMatrix4(inverseTransforms[vertex]).toArray(corrected, vertex * 3);
        if (!corrected.every(Number.isFinite)) throw new Error('The garment contact correction produced invalid positions.');
        points.array.set(corrected);
      },
    };
  } finally { bodyGeometry.dispose(); garmentGeometry.dispose(); }
}

/** Pure typed-array boundary shared by worker and offline verification. */
export function solveGarmentContact(payload) {
  const started = performance.now(), body = new BufferGeometry(), garment = new BufferGeometry();
  body.setAttribute('position', new BufferAttribute(payload.bodyPositions, 3)); body.setIndex(new BufferAttribute(payload.bodyIndices, 1));
  garment.setAttribute('position', new BufferAttribute(payload.garmentPositions, 3)); garment.setIndex(new BufferAttribute(payload.garmentIndices, 1));
  try {
    const options = { originalVertices: payload.originalVertices, outwardNormals: payload.outwardNormals };
    const initial = payload.garmentPositions.slice();
    let result = fitGarmentContact(body, garment, options);
    if (!result.converged) {
      const first = payload.garmentPositions.slice();
      payload.garmentPositions.set(initial);
      const alternative = fitGarmentContact(body, garment, { ...options, intersectionMode: 'outward-plane' });
      if (alternative.converged) result = { ...alternative, intersectionMode: 'outward-plane' };
      else payload.garmentPositions.set(first);
    }
    if (!result.converged && payload.bodyRegions) {
      const previous = payload.garmentPositions.slice();
      payload.garmentPositions.set(initial);
      const proxies = createBodyCollisionProxies(payload.bodyRegions, body, 0.003);
      const candidate = fitGarmentProxies(proxies, garment, options);
      const classification = classifyGarmentOutsideProxies(body, garment, createBodyCollisionProxies(payload.bodyRegions, body, 0));
      const bodyBvh = new MeshBVH(body, { indirect: true, maxLeafTris: 8 });
      garment.boundsTree = new MeshBVH(garment, { indirect: true, maxLeafTris: 8 });
      const gap = bodyBvh.closestPointToGeometry(garment, new Matrix4(), {}, {}).distance;
      let displacement = 0;
      for (let vertex = 0; vertex < initial.length / 3; vertex++) displacement = Math.max(displacement,
        Math.hypot(...[0, 1, 2].map(axis => payload.garmentPositions[vertex * 3 + axis] - initial[vertex * 3 + axis])));
      if (classification.outsideProxy && gap >= 0.002 && displacement <= 0.0800001) {
        result = { ...candidate, converged: true, solver: 'convex-parts-certified-exterior', minimumGapMetres: gap,
          minimumSignedMetres: null, maximumDisplacementMetres: displacement, exteriorClassification: classification };
      } else payload.garmentPositions.set(previous);
    }
    return { positions: payload.garmentPositions, result: { ...result, solveMs: performance.now() - started } };
  } finally { body.dispose(); garment.dispose(); }
}

export function correctPosedGarment(body, garment, data) {
  const prepared = prepareGarmentContact(body, garment, data), solved = solveGarmentContact(prepared.payload);
  prepared.apply(solved.positions);
  return solved.result;
}
