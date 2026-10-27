import { Line3, Matrix4 } from 'three';
import { MeshBVH } from 'three-mesh-bvh';

/** Nonadjacent proper crossings. Weld exact posed UV duplicates before
 * excluding shared vertices. Shared-edge adjacency and point/coplanar touches
 * are not counted as proper crossings; this is not a watertightness claim. */
export function measureBodySelfContact(geometry) {
  const position = geometry.attributes.position, index = geometry.index, vertices = [], welded = new Map();
  for (let i = 0; i < position.count; i++) {
    const key = `${position.getX(i)},${position.getY(i)},${position.getZ(i)}`;
    if (!welded.has(key)) welded.set(key, welded.size);
    vertices[i] = welded.get(key);
  }
  const faceVertices = Array.from({ length: index.count / 3 }, (_, face) => [0, 1, 2].map(corner => vertices[index.getX(face * 3 + corner)]));
  const bvh = new MeshBVH(geometry, { indirect: true, maxLeafTris: 8 }), segment = new Line3();
  const pairs = [], faces = new Set(), examples = [];
  bvh.bvhcast(bvh, new Matrix4(), { intersectsTriangles(a, b, ai, bi) {
    const first = bvh.resolveTriangleIndex(ai), second = bvh.resolveTriangleIndex(bi);
    if (first >= second || faceVertices[first].some(vertex => faceVertices[second].includes(vertex))) return false;
    if (!a.intersectsTriangle(b, segment) || segment.distance() <= 1e-6) return false;
    pairs.push(`${first}/${second}`); faces.add(first); faces.add(second);
    if (examples.length < 12) examples.push({ first, second, lengthMm: segment.distance() * 1000 });
    return false;
  } });
  return { nonadjacentCrossingPairs: pairs.length, crossingTriangles: faces.size, faceIndices: [...faces], pairs, examples };
}
