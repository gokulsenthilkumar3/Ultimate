import { Triangle, Vector3 } from 'three';

/** Nearest-feature pseudonormals avoid choosing an arbitrary face normal when
 * the closest point lies on a shared edge or vertex. UV duplicates are welded
 * by position for this read-only calculation. This remains a local sign test;
 * an open or self-intersecting surface is not a well-defined solid. */
export function createSurfaceContactNormal(geometry) {
  const positions = geometry.attributes.position, index = geometry.index;
  const welded = new Map(), vertexIds = [], vertexNormals = [], edgeNormals = new Map();
  const triangle = new Triangle(), normal = new Vector3(), first = new Vector3(), second = new Vector3();
  const barycentric = new Vector3();
  for (let vertex = 0; vertex < positions.count; vertex++) {
    const key = `${positions.getX(vertex)},${positions.getY(vertex)},${positions.getZ(vertex)}`;
    if (!welded.has(key)) { welded.set(key, vertexNormals.length); vertexNormals.push(new Vector3()); }
    vertexIds[vertex] = welded.get(key);
  }
  const edgeKey = (a, b) => a < b ? `${a}/${b}` : `${b}/${a}`;
  function load(face) {
    triangle.a.fromBufferAttribute(positions, index.getX(face * 3));
    triangle.b.fromBufferAttribute(positions, index.getX(face * 3 + 1));
    triangle.c.fromBufferAttribute(positions, index.getX(face * 3 + 2));
    return triangle;
  }
  for (let face = 0; face < index.count / 3; face++) {
    load(face).getNormal(normal);
    const points = [triangle.a, triangle.b, triangle.c];
    const ids = [0, 1, 2].map(corner => vertexIds[index.getX(face * 3 + corner)]);
    for (let corner = 0; corner < 3; corner++) {
      first.subVectors(points[(corner + 1) % 3], points[corner]);
      second.subVectors(points[(corner + 2) % 3], points[corner]);
      if (first.lengthSq() && second.lengthSq()) vertexNormals[ids[corner]].addScaledVector(normal, first.angleTo(second));
      const key = edgeKey(ids[corner], ids[(corner + 1) % 3]);
      if (!edgeNormals.has(key)) edgeNormals.set(key, new Vector3());
      edgeNormals.get(key).add(normal);
    }
  }
  return (face, closestPoint, target) => {
    load(face).getNormal(target);
    if (!triangle.getBarycoord(closestPoint, barycentric)) return target;
    const weights = barycentric.toArray(), active = [0, 1, 2].filter(corner => weights[corner] > 1e-7);
    const ids = active.map(corner => vertexIds[index.getX(face * 3 + corner)]);
    const feature = active.length === 1 ? vertexNormals[ids[0]] : active.length === 2 ? edgeNormals.get(edgeKey(...ids)) : null;
    if (feature?.lengthSq() > 1e-12) target.copy(feature).normalize();
    return target;
  };
}
