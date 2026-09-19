import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

function load(name) {
  const buffer = readFileSync(resolve('public/assets/models', name));
  return JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString().trim());
}

describe('shipped human assets', () => {
  for (const file of ['humanoid-base.glb', 'humanoid-base-lite.glb']) {
    it(`${file} binds accessories and gives them effective head-follow morphs`, () => {
      const glb = load(file);
      const head = glb.nodes.findIndex((node) => node.name === 'Head');
      const body = glb.meshes.find((mesh) => mesh.name === 'GrowthTrackBody');
      for (const name of ['GrowthTrackEyes', 'GrowthTrackHair']) {
        const index = glb.nodes.findIndex((node) => node.name === name);
        const node = glb.nodes[index];
        const mesh = glb.meshes[node.mesh];
        expect(node.extras.alignment).toBe('makehuman-proxy');
        expect(glb.nodes[head].children).toContain(index);
        expect(mesh.extras.targetNames).toEqual(body.extras.targetNames);
        const torso = mesh.extras.targetNames.indexOf('torso_length');
        expect(glb.accessors[mesh.primitives[0].targets[torso].POSITION].sparse.count).toBeGreaterThan(0);
      }
      for (const name of ['ear_prominence', 'shoulder_drop']) {
        const index = body.extras.targetNames.indexOf(name);
        expect(glb.accessors[body.primitives[0].targets[index].POSITION].sparse.count).toBeGreaterThan(0);
      }
    });
  }
});
