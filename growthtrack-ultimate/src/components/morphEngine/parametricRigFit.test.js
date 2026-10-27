// @vitest-environment node
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { createParametricIdentity } from './parametricIdentity.js';

let source;
beforeAll(async () => {
  const bytes = readFileSync('public/assets/models/parametric-base-v1.glb');
  source = (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
});

describe('instance-owned parametric joint fitting', () => {
  it('moves height-dependent joints without moving rest vertices through skinning or changing the source', () => {
    const sourceBody = source.getObjectByName('Body'), original = sourceBody.skeleton.bones.map(bone => bone.position.toArray());
    const identity = createParametricIdentity(source), body = identity.scene.getObjectByName('Body');
    const head = body.skeleton.bones.find(bone => /Head$/.test(bone.name));
    identity.scene.updateMatrixWorld(true);
    const before = head.getWorldPosition(new Vector3());
    try {
      identity.setWeights({ heightTaller: 0.75 });
      expect(head.getWorldPosition(new Vector3()).distanceTo(before)).toBeGreaterThan(0.05);
      for (let vertex = 0; vertex < body.geometry.attributes.position.count; vertex += 73) {
        const raw = new Vector3().fromBufferAttribute(body.geometry.attributes.position, vertex);
        expect(body.applyBoneTransform(vertex, raw.clone()).distanceTo(raw)).toBeLessThan(1e-6);
      }
      identity.setWeights({});
      expect(head.getWorldPosition(new Vector3()).distanceTo(before)).toBeLessThan(1e-7);
      expect(sourceBody.skeleton.bones.map(bone => bone.position.toArray())).toEqual(original);
    } finally { identity.dispose(); }
  });
  it('preserves an active pose across identity updates and does not accumulate joint drift', () => {
    const first = createParametricIdentity(source), second = createParametricIdentity(source);
    const body = first.scene.getObjectByName('Body');
    const arm = body.skeleton.bones.find(bone => /LeftArm$/.test(bone.name));
    arm.rotation.z = 0.6;
    const pose = arm.quaternion.clone();
    try {
      for (let repeat = 0; repeat < 3; repeat++) { first.setWeights({ heightShorter: 0.5 }); first.setWeights({ heightTaller: 0.75 }); }
      second.setWeights({ heightTaller: 0.75 });
      expect(arm.quaternion.angleTo(pose)).toBeLessThan(1e-7);
      const other = second.scene.getObjectByName('Body');
      for (let joint = 0; joint < body.skeleton.bones.length; joint++) {
        expect(body.skeleton.bones[joint].position.distanceTo(other.skeleton.bones[joint].position)).toBeLessThan(1e-6);
        body.skeleton.boneInverses[joint].elements.forEach((value, index) => expect(value).toBeCloseTo(other.skeleton.boneInverses[joint].elements[index], 6));
      }
    } finally { first.dispose(); second.dispose(); }
  });
});
