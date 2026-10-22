export const BONE_MAP = {
  // Head & Spine
  head:          ['Head', 'head', 'mixamorigHead', 'Bip01_Head'],
  neck:          ['Neck', 'neck', 'mixamorigNeck', 'Bip01_Neck'],
  spine1:        ['Spine1', 'spine1', 'mixamorigSpine1', 'Bip01_Spine1', 'Spine'],
  spine2:        ['Spine2', 'spine2', 'mixamorigSpine2', 'Bip01_Spine2'],
  hips:          ['Hips', 'hips', 'mixamorigHips', 'Bip01_Pelvis', 'Root'],

  // Shoulders & Arms
  leftShoulder:  ['LeftShoulder', 'mixamorigLeftShoulder', 'Bip01_L_Clavicle', 'L_Clavicle'],
  rightShoulder: ['RightShoulder', 'mixamorigRightShoulder', 'Bip01_R_Clavicle', 'R_Clavicle'],
  leftUpperArm:  ['LeftUpperArm', 'mixamorigLeftArm', 'Bip01_L_UpperArm', 'L_UpperArm'],
  rightUpperArm: ['RightUpperArm', 'mixamorigRightArm', 'Bip01_R_UpperArm', 'R_UpperArm'],
  leftForeArm:   ['LeftForeArm', 'mixamorigLeftForeArm', 'Bip01_L_Forearm', 'L_Forearm'],
  rightForeArm:  ['RightForeArm', 'mixamorigRightForeArm', 'Bip01_R_Forearm', 'R_Forearm'],

  // Hands
  leftHand:      ['LeftHand', 'mixamorigLeftHand', 'Bip01_L_Hand', 'L_Hand'],
  rightHand:     ['RightHand', 'mixamorigRightHand', 'Bip01_R_Hand', 'R_Hand'],

  // Left finger chains
  leftThumb1:    ['LeftHandThumb1', 'mixamorigLeftHandThumb1', 'L_Thumb1'],
  leftThumb2:    ['LeftHandThumb2', 'mixamorigLeftHandThumb2', 'L_Thumb2'],
  leftIndex1:    ['LeftHandIndex1', 'mixamorigLeftHandIndex1', 'L_Index1'],
  leftIndex2:    ['LeftHandIndex2', 'mixamorigLeftHandIndex2', 'L_Index2'],
  leftMiddle1:   ['LeftHandMiddle1', 'mixamorigLeftHandMiddle1', 'L_Middle1'],
  leftRing1:     ['LeftHandRing1', 'mixamorigLeftHandRing1', 'L_Ring1'],
  leftPinky1:    ['LeftHandPinky1', 'mixamorigLeftHandPinky1', 'L_Pinky1'],

  // Right finger chains
  rightThumb1:   ['RightHandThumb1', 'mixamorigRightHandThumb1', 'R_Thumb1'],
  rightThumb2:   ['RightHandThumb2', 'mixamorigRightHandThumb2', 'R_Thumb2'],
  rightIndex1:   ['RightHandIndex1', 'mixamorigRightHandIndex1', 'R_Index1'],
  rightIndex2:   ['RightHandIndex2', 'mixamorigRightHandIndex2', 'R_Index2'],
  rightMiddle1:  ['RightHandMiddle1', 'mixamorigRightHandMiddle1', 'R_Middle1'],
  rightRing1:    ['RightHandRing1', 'mixamorigRightHandRing1', 'R_Ring1'],
  rightPinky1:   ['RightHandPinky1', 'mixamorigRightHandPinky1', 'R_Pinky1'],

  // Legs
  leftThigh:     ['LeftUpLeg', 'mixamorigLeftUpLeg', 'Bip01_L_Thigh', 'L_Thigh', 'LeftLeg'],
  rightThigh:    ['RightUpLeg', 'mixamorigRightUpLeg', 'Bip01_R_Thigh', 'R_Thigh', 'RightLeg'],
  leftShin:      ['LeftLeg', 'mixamorigLeftLeg', 'Bip01_L_Calf', 'L_Calf'],
  rightShin:     ['RightLeg', 'mixamorigRightLeg', 'Bip01_R_Calf', 'R_Calf'],

  // Feet
  leftFoot:      ['LeftFoot', 'mixamorigLeftFoot', 'Bip01_L_Foot', 'L_Foot'],
  rightFoot:     ['RightFoot', 'mixamorigRightFoot', 'Bip01_R_Foot', 'R_Foot'],
  leftToe:       ['LeftToeBase', 'mixamorigLeftToeBase', 'Bip01_L_Toe0', 'L_Toe'],
  rightToe:      ['RightToeBase', 'mixamorigRightToeBase', 'Bip01_R_Toe0', 'R_Toe'],
};

export function resolveRigBones(skeleton) {
  const resolved=Object.fromEntries(Object.entries(BONE_MAP).map(([key,names])=>[key,names.map(name=>skeleton?.bones.find(bone=>bone.name===name)).find(Boolean)]));
  for(const bone of skeleton?.bones || [])if(bone.userData.poseKey && !Object.values(resolved).includes(bone))resolved[bone.userData.poseKey]=bone;
  return resolved;
}
