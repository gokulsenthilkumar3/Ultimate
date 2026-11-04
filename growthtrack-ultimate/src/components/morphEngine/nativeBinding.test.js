// @vitest-environment node
import { expect, it } from 'vitest';
import { rebindNativePackage } from '../../../scripts/human-realism/native-package-binding.mjs';

const previousHash = 'a'.repeat(64), bodyHash = 'b'.repeat(64);
const fixture = () => ({
  json: {
    asset: { extras: { privatePackage: true, lod: 'core', bodySha256: previousHash } },
    meshes: [0, 1].map(index => ({ extras: { nativeBinding: { lod: 'core', bodySha256: previousHash, removedBodyTriangles: [index] } } })),
    nodes: [{ mesh: 0, extras: { nativeBinding: { lod: 'core', bodySha256: previousHash } } }],
  },
  bin: Buffer.from([1, 2, 3, 4]),
});

it('refreshes every native binding while preserving binary geometry and the source document', () => {
  const original = fixture();
  const rebound = rebindNativePackage(original, { lod: 'core', previousHash, bodyHash });
  expect(rebound.bin).toBe(original.bin);
  expect(rebound.json.asset.extras.bodySha256).toBe(bodyHash);
  for (const mesh of rebound.json.meshes) expect(mesh.extras.nativeBinding.bodySha256).toBe(bodyHash);
  for (const node of rebound.json.nodes) expect(node.extras.nativeBinding.bodySha256).toBe(bodyHash);
  expect(rebound.json.meshes.map(mesh => mesh.extras.nativeBinding.removedBodyTriangles)).toEqual([[0], [1]]);
  expect(original.json.asset.extras.bodySha256).toBe(previousHash);
  expect(original.json.meshes[0].extras.nativeBinding.bodySha256).toBe(previousHash);
  expect(original.json.nodes[0].extras.nativeBinding.bodySha256).toBe(previousHash);
});

it('rejects another body, detail level or internally inconsistent package', () => {
  for (const options of [{ lod: 'hero', previousHash, bodyHash }, { lod: 'core', previousHash: bodyHash, bodyHash }]) {
    expect(() => rebindNativePackage(fixture(), options)).toThrow(/does not match/);
  }
  const mixed = fixture();
  mixed.json.meshes[1].extras.nativeBinding.bodySha256 = bodyHash;
  expect(() => rebindNativePackage(mixed, { lod: 'core', previousHash, bodyHash })).toThrow(/does not match/);
  const mixedNode = fixture();
  mixedNode.json.nodes[0].extras.nativeBinding.bodySha256 = bodyHash;
  expect(() => rebindNativePackage(mixedNode, { lod: 'core', previousHash, bodyHash })).toThrow(/does not match/);
  expect(() => rebindNativePackage(fixture(), { lod: 'core', previousHash, bodyHash: '' })).toThrow(/verified body hashes/);
});
