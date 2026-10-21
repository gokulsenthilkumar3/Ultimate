import * as THREE from 'three';

export function postureOffsets(posture = {}) {
  const angle = key => THREE.MathUtils.degToRad(THREE.MathUtils.clamp(Number(posture[key]) || 0, -35, 35));
  // The source attachment maps and joint landmarks share an authored A-pose.
  // Missing posture data must preserve it: the old unconditional shoulder and
  // wrist rotations distorted even an untouched profile.
  // This V1 asset has a deliberately small 20-joint preview rig. Its source
  // weights are safe for a neutral stance but not yet certified for clavicle,
  // elbow, or wrist posing. Keep the upper limbs in their authored pose until
  // the Blender/MPFB deformation rig and corrective shapes replace it.
  return {
    head: [angle('headTiltAngle') * .7, 0, 0],
    neck: [angle('headTiltAngle') * .3, 0, 0],
    hips: [-angle('pelvicTilt') * .6, 0, 0],
    spine1: [angle('pelvicTilt') * .3, 0, 0],
    // Rolling around Y moves both shoulders forward without changing their
    // apparent width. The old Z rotation incorrectly abducted the arms.
    leftShoulder: [0, 0, 0],
    rightShoulder: [0, 0, 0],
    leftUpperArm: [0, 0, 0],
    rightUpperArm: [0, 0, 0],
    leftForeArm: [0, 0, 0],
    rightForeArm: [0, 0, 0],
    leftHand: [0, 0, 0],
    rightHand: [0, 0, 0],
  };
}
