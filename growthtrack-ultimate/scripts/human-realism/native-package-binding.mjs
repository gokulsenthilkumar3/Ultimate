/** Refresh byte-identity bindings after a verified texture-only public upgrade.
 * Geometry, compressed buffers, rig weights and triangle bindings stay intact.
 */
export function rebindNativePackage(glb, { lod, previousHash, bodyHash }) {
  if (![previousHash, bodyHash].every(value => /^[a-f0-9]{64}$/.test(value))) {
    throw new Error('Native binding requires verified body hashes');
  }
  const json = structuredClone(glb.json);
  const asset = json.asset?.extras;
  // GLTF node extras can override mesh extras when loaders merge userData.
  const bindings = [...(json.meshes || []), ...(json.nodes || [])]
    .map(item => item.extras?.nativeBinding).filter(Boolean);
  if (!asset?.privatePackage || asset.lod !== lod || asset.bodySha256 !== previousHash || !bindings.length
    || bindings.some(binding => binding.lod !== lod || binding.bodySha256 !== previousHash)) {
    throw new Error('Native package does not match the previous public body');
  }
  asset.bodySha256 = bodyHash;
  for (const binding of bindings) binding.bodySha256 = bodyHash;
  return { json, bin: glb.bin };
}
