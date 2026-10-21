import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { fitModelFeatures } from '../components/morphEngine/fitModelFeatures';

describe('fitModelFeatures', () => {
  it('centres and scales calibrated eyes at a human eye line', () => {
    const scene = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.65, 0.42));
    body.position.y = 0.025;
    const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.04));
    eyes.position.set(0.15, 0.5, 0.23);
    eyes.userData.alignment = 'body-surface-calibrated';
    scene.add(body, eyes);
    const calibratedFront = new THREE.Box3().setFromObject(eyes).max.z;

    fitModelFeatures(body, [{ mesh: eyes, feature: 'eyes' }]);

    const bodyBox = new THREE.Box3().setFromObject(body);
    const eyeBox = new THREE.Box3().setFromObject(eyes);
    const eyeCenter = eyeBox.getCenter(new THREE.Vector3());
    const eyeSize = eyeBox.getSize(new THREE.Vector3());
    const height = bodyBox.max.y - bodyBox.min.y;

    expect(eyeCenter.x).toBeCloseTo(0, 5);
    expect(eyeCenter.y).toBeCloseTo(bodyBox.min.y + height * 0.947, 5);
    expect(eyeSize.x).toBeCloseTo(height * 0.048, 5);
    expect(eyeBox.max.z).toBeCloseTo(calibratedFront, 5);
    expect(eyes.userData.fittedToBody).toBe(true);
  });

  it('keeps calibrated hair cards on the crown instead of across the face', () => {
    const scene = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.65, 0.42));
    body.position.y = 0.025;
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.22));
    hair.position.set(0, 0.6, 0.04);
    hair.userData.alignment = 'body-surface-calibrated';
    scene.add(body, hair);

    fitModelFeatures(body, [{ mesh: hair, feature: 'hair' }]);

    const bodyBox = new THREE.Box3().setFromObject(body);
    const hairBox = new THREE.Box3().setFromObject(hair);
    const height = bodyBox.max.y - bodyBox.min.y;
    expect(hairBox.max.y).toBeCloseTo(bodyBox.max.y + height * .008, 5);
    expect(hairBox.min.y).toBeGreaterThan(bodyBox.min.y + height * .90);
    expect(hair.userData.fittedToBody).toBe(true);
  });
});
