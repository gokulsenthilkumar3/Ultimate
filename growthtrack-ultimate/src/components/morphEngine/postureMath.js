import * as THREE from 'three';

export function postureOffsets(posture = {}) {
  const angle = key => THREE.MathUtils.degToRad(THREE.MathUtils.clamp(Number(posture[key]) || 0, -35, 35));
  // The production mesh is authored with a scan-friendly A-pose. Rotate that
  // into a relaxed inspection stance so the silhouette matches how people
  // naturally stand in front of a mirror. Keep this independent from body
  // measurements: pose must never make an arm circumference look different.
  const armRelax = THREE.MathUtils.degToRad(
    THREE.MathUtils.clamp(Number(posture.armRelaxAngle) || 36, 20, 38),
  );
  // Share the drop between the clavicle and humerus. Concentrating the full
  // correction on the upper-arm joint creates a pointed deltoid on this rig.
  const shoulderEase = armRelax * .62;
  const upperArmRelax = armRelax - shoulderEase;
  const armBacksweep = THREE.MathUtils.degToRad(10);
  const forearmBacksweep = THREE.MathUtils.degToRad(42);
  const handBacksweep = THREE.MathUtils.degToRad(32);
  // Preserve a visible posture signal without letting rounded-shoulder data
  // push the relaxed hands in front of the hips in the profile view.
  const shoulderRoll = angle('shoulderRounding') * .32;
  return {
    head: [angle('headTiltAngle') * .7, 0, 0],
    neck: [angle('headTiltAngle') * .3, 0, 0],
    hips: [-angle('pelvicTilt') * .6, 0, 0],
    spine1: [angle('pelvicTilt') * .3, 0, 0],
    // Rolling around Y moves both shoulders forward without changing their
    // apparent width. The old Z rotation incorrectly abducted the arms.
    leftShoulder: [0, shoulderRoll, shoulderEase],
    rightShoulder: [0, -shoulderRoll, -shoulderEase],
    leftUpperArm: [0, -armBacksweep, upperArmRelax],
    rightUpperArm: [0, armBacksweep, -upperArmRelax],
    leftForeArm: [0, -forearmBacksweep, 0],
    rightForeArm: [0, forearmBacksweep, 0],
    leftHand: [0, -handBacksweep, 0],
    rightHand: [0, handBacksweep, 0],
  };
}
