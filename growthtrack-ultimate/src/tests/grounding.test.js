import { describe, it, expect } from 'vitest';
import { BufferGeometry, Float32BufferAttribute, Group, Mesh, Vector3 } from 'three';
import { createSoleGrounder } from '../components/morphEngine/grounding';

describe('deformed sole grounding', () => {
  it('keeps feet above the stage when a leg morph extends downwards', () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute([0, -1, 0, 0, 1, 0, 0.2, -0.95, 0.2], 3));
    geometry.morphTargetsRelative = true;
    geometry.morphAttributes.position = [new Float32BufferAttribute([0, -0.3, 0, 0, 0, 0, 0, -0.2, 0], 3)];
    const mesh = new Mesh(geometry);
    const scene = new Group();
    scene.scale.setScalar(1.2);
    scene.add(mesh);
    const ground = createSoleGrounder(mesh, scene);
    const sole = new Vector3();
    for (const weight of [0, 0.25, 0.5, 1, 0]) {
      mesh.morphTargetInfluences[0] = weight;
      ground(0.04);
      scene.updateMatrixWorld(true);
      mesh.getVertexPosition(0, sole);
      mesh.localToWorld(sole);
      expect(sole.y).toBeCloseTo(0.04, 6);
    }
  });
});
