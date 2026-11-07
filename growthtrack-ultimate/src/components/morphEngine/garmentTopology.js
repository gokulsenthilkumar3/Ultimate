/** Fingerprint vertex correspondence without depending on mutable positions,
 * normals or skin weights. UV order and triangle indices survive body fitting. */
export function garmentTopology(geometry) {
  const uv = geometry?.attributes?.uv, index = geometry?.index;
  if (!uv || !index) return null;
  let hash = 2166136261;
  const bytes = new DataView(new ArrayBuffer(8));
  const add = value => {
    bytes.setFloat64(0, value, true);
    for (let i = 0; i < 8; i++) hash = Math.imul(hash ^ bytes.getUint8(i), 16777619);
  };
  for (let i = 0; i < uv.count; i++) { add(uv.getX(i)); add(uv.getY(i)); }
  for (let i = 0; i < index.count; i++) add(index.getX(i));
  return `${geometry.attributes.position.count}:${uv.count}:${index.count}:${(hash >>> 0).toString(16)}`;
}
