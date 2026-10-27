// @vitest-environment node
import { expect, it } from 'vitest';
import { BufferGeometry, Float32BufferAttribute, Mesh } from 'three';
import { inspectHeadCapabilities } from './headCapabilities';

it('rejects named zero, malformed and non-finite targets without changing the mesh', () => {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 1, 1], 3));
  geometry.morphTargetsRelative = true;
  geometry.morphAttributes.position = [
    new Float32BufferAttribute([0, 0, 0, .001, 0, 0], 3),
    new Float32BufferAttribute(new Float32Array(6), 3),
    new Float32BufferAttribute([.001, 0, 0, NaN, 0, 0], 3),
    new Float32BufferAttribute([.001, 0, 0], 3),
  ];
  const body = new Mesh(geometry);
  body.morphTargetDictionary = { nose_bridge_width: 0, nose_tip_size: 1, jaw_width: 2, ear_prominence: 3 };
  const before = geometry.attributes.position.array.slice();
  expect(inspectHeadCapabilities(body)).toMatchObject({
    shapeTargets: ['nose_bridge_width'], expressionTargets: [], oralAssembly: null,
    calibration: 'artistic', verification: 'finite-nonzero-displacement',
  });
  expect(geometry.attributes.position.array).toEqual(before);
  expect(inspectHeadCapabilities(null).shapeTargets).toEqual([]);
  geometry.dispose(); body.material.dispose();
});

it('checks absolute targets relative to their rest positions', () => {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([1, 2, 3], 3));
  geometry.morphAttributes.position = [
    new Float32BufferAttribute([1, 2, 3], 3),
    new Float32BufferAttribute([1, 2.1, 3], 3),
  ];
  const body = new Mesh(geometry);
  body.morphTargetDictionary = { blink: 0, jaw_open: 1 };
  body.userData.faceCorrective = { method: 'calibrated-mouth-corrective' };
  expect(inspectHeadCapabilities(body)).toMatchObject({
    expressionTargets: ['jaw_open'], oralAssembly: 'differentiated-procedural',
  });
  geometry.dispose(); body.material.dispose();
});
