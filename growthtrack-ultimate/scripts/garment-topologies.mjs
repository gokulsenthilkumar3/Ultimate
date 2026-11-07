import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BufferAttribute, BufferGeometry } from 'three';
import { readGlb, readAccessor } from './plan-preview/glb.mjs';
import { garmentTopology } from '../src/components/morphEngine/garmentTopology.js';
import surface from '../src/config/humanSurface.json' with { type: 'json' };
import humanManifest from '../src/config/humanAssetManifest.json' with { type: 'json' };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sources = [...surface.reviewedBundledAssets, ...Object.values(humanManifest.assets).map(asset => asset.file)];
const topologies = sources.map(file => {
  const glb = readGlb(path.join(root, 'public/assets/models', file));
  const primitive = glb.json.meshes.find(mesh => mesh.name === 'GrowthTrackBody').primitives[0];
  const geometry = new BufferGeometry();
  for (const [name, id, size] of [['position', primitive.attributes.POSITION, 3], ['uv', primitive.attributes.TEXCOORD_0, 2]]) {
    geometry.setAttribute(name, new BufferAttribute(readAccessor(glb, id).data, size));
  }
  geometry.setIndex(new BufferAttribute(readAccessor(glb, primitive.indices).data, 1));
  const topology = garmentTopology(geometry);
  geometry.dispose();
  return { file, topology };
});
const output = path.join(root, 'src/config/garmentTopologies.json');
const text = JSON.stringify({ sources: topologies }, null, 2) + '\n';
if (process.argv.includes('--write')) fs.writeFileSync(output, text);
else if (fs.readFileSync(output, 'utf8').replaceAll('\r\n', '\n') !== text) throw new Error('Garment topologies changed; review correspondence before regenerating.');
console.log('Garment topology catalog verified.');
