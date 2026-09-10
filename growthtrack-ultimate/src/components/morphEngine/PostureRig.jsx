import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { postureOffsets } from './postureMath';

const BONE_MAP = {
  head: ['Head', 'mixamorigHead'], neck: ['Neck', 'mixamorigNeck'],
  hips: ['Hips', 'mixamorigHips'], spine1: ['Spine1', 'mixamorigSpine1'],
  leftShoulder: ['LeftShoulder', 'mixamorigLeftShoulder'],
  rightShoulder: ['RightShoulder', 'mixamorigRightShoulder'],
  leftUpperArm: ['LeftUpperArm', 'mixamorigLeftArm'],
  rightUpperArm: ['RightUpperArm', 'mixamorigRightArm'],
  leftForeArm: ['LeftForeArm', 'mixamorigLeftForeArm'],
  rightForeArm: ['RightForeArm', 'mixamorigRightForeArm'],
  leftHand: ['LeftHand', 'mixamorigLeftHand'],
  rightHand: ['RightHand', 'mixamorigRightHand'],
};

// A posture is an offset from this asset's authored rest pose. Body weight
// does not establish posture, and each comparison figure has its own offsets.
function usePostureRig(skeleton, posture) {
  const bones = useMemo(() => Object.fromEntries(Object.entries(BONE_MAP).map(([key, names]) => {
    const bone = skeleton?.bones?.find(item => names.includes(item.name));
    return [key, bone ? { bone, rest: bone.quaternion.clone(), target: new THREE.Quaternion() } : null];
  })), [skeleton]);
  const offsets = useMemo(() => postureOffsets(posture), [posture]);
  const euler = useMemo(() => new THREE.Euler(), []);
  useEffect(() => () => {
    Object.values(bones).forEach(item => { if (item) item.bone.quaternion.copy(item.rest); });
  }, [bones]);
  useFrame((_, delta) => {
    const factor = 1 - Math.exp(-Math.max(0, delta) * 5);
    Object.entries(offsets).forEach(([key, angles]) => {
      const item = bones[key];
      if (!item) return;
      item.target.setFromEuler(euler.set(...angles)).premultiply(item.rest);
      item.bone.quaternion.slerp(item.target, factor);
    });
  });
}

export default function PostureRig({ skeleton, posture }) {
  usePostureRig(skeleton, posture);
  return null;
}
