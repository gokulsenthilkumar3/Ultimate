import { Vector3 } from 'three';
import { ConvexHull } from 'three/addons/math/ConvexHull.js';

export function validateClassificationSurface(geometry) {
  const position = geometry?.attributes?.position, index = geometry?.index;
  if (!position || position.itemSize !== 3 || !position.count || !index?.count || index.count % 3) {
    throw new Error('Proxy classification requires finite indexed triangle surfaces.');
  }
  // Read XYZ through accessors: canonical assets may use interleaved buffers.
  for (let vertex = 0; vertex < position.count; vertex++) {
    if (![position.getX(vertex), position.getY(vertex), position.getZ(vertex)].every(Number.isFinite)) {
      throw new Error('Proxy classification requires finite indexed triangle surfaces.');
    }
  }
  for (let corner = 0; corner < index.count; corner++) {
    const vertex = index.getX(corner);
    if (!Number.isInteger(vertex) || vertex < 0 || vertex >= position.count) throw new Error('Invalid surface triangle index.');
  }
}

export function validateClosedProxy(proxy) {
  if (!proxy.watertight || proxy.clearance !== 0 || !Array.isArray(proxy.planes) || proxy.planes.length < 4
    || !Array.isArray(proxy.sourceFaces)) throw new Error('Classification requires closed, unexpanded convex parts.');
  for (const { normal, constant } of proxy.planes) {
    if (!normal?.isVector3 || ![normal.x, normal.y, normal.z, constant].every(Number.isFinite)
      || Math.abs(normal.lengthSq() - 1) > 1e-6) throw new Error('Invalid convex classification plane.');
  }
  // A boolean label alone does not establish a closed solid. The halfspaces
  // are bounded only when their normals positively span all three axes.
  const normals = new ConvexHull().setFromPoints(proxy.planes.map(({ normal }) => normal.clone()));
  if (normals.faces.length < 4 || normals.faces.some(face => face.constant <= 1e-8)) {
    throw new Error('Classification requires a bounded closed convex volume.');
  }
}

/** Clip the ENTIRE triangle against a closed convex volume. Vertex-only
 * classification would miss a triangle spanning a thin finger or box. */
export function triangleIntersectsConvex(triangle, planes, tolerance = 1e-8) {
  let polygon = triangle.map(point => point.clone());
  for (const { normal, constant } of planes) {
    const next = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      const da = normal.dot(a) - constant - tolerance, db = normal.dot(b) - constant - tolerance;
      if (da <= 0) next.push(a);
      if ((da <= 0) !== (db <= 0)) next.push(a.clone().lerp(b, da / (da - db)));
    }
    polygon = next;
    if (!polygon.length) return false;
  }
  return polygon.length > 0;
}

/** Independent exterior certificate for the union of CLOSED convex parts.
 * Every source triangle must be enclosed in its assigned convex part. Every
 * garment triangle must be disjoint from EVERY part, including its interior.
 * Raw (unexpanded) hulls avoid treating a conservative margin as skin. The
 * separate global source-triangle gap still enforces the physical clearance.
 * No nearest normal, solver convergence flag, or broad-phase box is trusted. */
export function classifyGarmentOutsideProxies(body, garment, proxies) {
  validateClassificationSurface(body); validateClassificationSurface(garment);
  const covered = new Set(), point = new Vector3(), triangle = [new Vector3(), new Vector3(), new Vector3()];
  let uncoveredCorners = 0;
  for (const proxy of proxies) {
    validateClosedProxy(proxy);
    for (const face of proxy.sourceFaces) {
      if (!Number.isInteger(face) || face < 0 || face >= body.index.count / 3) throw new Error('Invalid proxy source triangle.');
      covered.add(face);
      for (let corner = 0; corner < 3; corner++) {
        point.fromBufferAttribute(body.attributes.position, body.index.getX(face * 3 + corner));
        if (proxy.planes.some(plane => plane.normal.dot(point) > plane.constant + 1e-7)) uncoveredCorners++;
      }
    }
  }
  const enclosedSource = covered.size === body.index.count / 3 && uncoveredCorners === 0;
  let contactPairs = 0;
  const contactsByPart = {}, garmentFaces = new Set(), examples = [];
  for (let face = 0; face < garment.index.count / 3; face++) {
    triangle.forEach((point, corner) => point.fromBufferAttribute(garment.attributes.position, garment.index.getX(face * 3 + corner)));
    for (const proxy of proxies) {
      if (!triangleIntersectsConvex(triangle, proxy.planes)) continue;
      contactPairs++; garmentFaces.add(face);
      contactsByPart[proxy.region] = (contactsByPart[proxy.region] || 0) + 1;
      if (examples.length < 12) examples.push({ face, region: proxy.region });
    }
  }
  return { method: 'whole-triangle-halfspace-clipping-against-closed-convex-part-union',
    enclosedSource, coveredBodyTriangles: covered.size, totalBodyTriangles: body.index.count / 3, uncoveredCorners,
    watertightParts: proxies.length, contactPairs, contactTriangles: garmentFaces.size, contactsByPart, examples,
    outsideProxy: enclosedSource && proxies.length > 0 && contactPairs === 0 };
}

/** Signed nearest-feature samples remain reported, but a certified exterior
 * can resolve a sign disagreement. Actual intersections and <2 mm gaps ALWAYS
 * fail, even when a caller supplies an exterior certificate. */
export function garmentAcceptance(contact, classification) {
  const surfaceClear = contact.intersectionPairs === 0 && Number.isFinite(contact.minimumTriangleGapMm)
    && Number.isFinite(contact.minimumRequiredGapMm) && contact.minimumRequiredGapMm > 0
    && contact.minimumTriangleGapMm >= contact.minimumRequiredGapMm;
  const signedDiagnosticsPass = contact.penetratingInteriorSamples === 0 && contact.penetratingOpeningBoundarySamples === 0;
  const exteriorCertified = classification?.outsideProxy === true && classification.enclosedSource === true;
  return { pass: surfaceClear && (signedDiagnosticsPass || exteriorCertified), surfaceClear, signedDiagnosticsPass, exteriorCertified,
    signedDiagnosticDisagreement: surfaceClear && !signedDiagnosticsPass && exteriorCertified,
    bodySelfIntersection: 'reported-separately-not-inferred-from-signed-samples' };
}
