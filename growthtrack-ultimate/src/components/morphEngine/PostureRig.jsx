/**
 * GrowthTrack Ultimate — Animation Engine
 * PostureRig.jsx (v2)
 *
 * Drives skeleton bone rotations from:
 *  1. Posture offsets (from measurements — e.g. headTilt, pelvicTilt)
 *  2. Active animation preset keyframes (walk, run, sit, etc.)
 *
 * The animation layer is additive on top of posture — both combine.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { postureOffsets } from './postureMath';
import use3DStore from '../../store/use3DStore';
import { sampleAnimation, ANIMATION_PRESET_MAP } from './animationPresets';

// ─────────────────────────────────────────────────────────────────────────────
// EXTENDED BONE MAP — supports hands, legs, feet, spine, hair
// Each entry: canonical key -> [possible bone names in authored GLB assets]
// ─────────────────────────────────────────────────────────────────────────────
const BONE_MAP = {
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

// Smooth transition speed (higher = snappier)
const LERP_SPEED = 4.5;

/**
 * Core hook: resolves skeleton bones, applies posture + animation offsets every frame.
 */
function usePostureRig(skeleton, posture, animationId, animTime) {
  const euler = useMemo(() => new THREE.Euler(), []);

  // Resolve bones from skeleton
  const bones = useMemo(() => {
    if (!skeleton?.bones) return {};
    return Object.fromEntries(
      Object.entries(BONE_MAP).map(([key, names]) => {
        const bone = skeleton.bones.find((b) => names.includes(b.name));
        if (!bone) return [key, null];
        return [key, {
          bone,
          rest: bone.quaternion.clone(),
          target: new THREE.Quaternion(),
        }];
      })
    );
  }, [skeleton]);

  // Restore rest pose on unmount / skeleton change
  useEffect(() => {
    return () => {
      Object.values(bones).forEach((item) => {
        if (item) item.bone.quaternion.copy(item.rest);
      });
    };
  }, [bones]);

  // Per-frame: combine posture + animation
  useFrame((_, delta) => {
    const factor = 1 - Math.exp(-Math.max(0, delta) * LERP_SPEED);

    // 1. Posture offsets from measurements (low-frequency changes)
    const postureOff = postureOffsets(posture);

    // 2. Animation frame sample (high-frequency keyframe animation)
    const preset = ANIMATION_PRESET_MAP[animationId];
    const animBones = sampleAnimation(preset, animTime.current);

    // Merge: animation overrides posture where both exist
    const allBoneKeys = new Set([
      ...Object.keys(postureOff),
      ...Object.keys(animBones),
    ]);

    for (const key of allBoneKeys) {
      const item = bones[key];
      if (!item) continue;

      const postureAngles = postureOff[key] || [0, 0, 0];
      const animAngles    = animBones[key]   || null;

      // If animation defines this bone, use animation; else use posture
      const [rx, ry, rz] = animAngles || postureAngles;

      item.target
        .setFromEuler(euler.set(rx, ry, rz))
        .premultiply(item.rest);

      item.bone.quaternion.slerp(item.target, factor);
    }
  });
}

/**
 * PostureRig component
 * Props:
 *   skeleton     THREE.Skeleton from the loaded GLB (or null)
 *   posture      PostureMetrics from store (headTilt, pelvicTilt, etc.)
 *   animationId  string — ID of animation preset to play (default: 'idle')
 *   playing      boolean — if true, advance time; if false, freeze at t=0
 *   speed        number — playback speed multiplier (default: 1)
 */
export default function PostureRig({ skeleton, posture, animationId = 'idle', playing = true, speed = 1 }) {
  const animTime = useRef(0);
  const preset = ANIMATION_PRESET_MAP[animationId];

  // Advance animation time
  useFrame((_, delta) => {
    if (!playing || !preset) return;
    if (preset.loop && preset.duration > 0) {
      animTime.current = (animTime.current + delta * speed) % preset.duration;
    } else if (!preset.loop) {
      animTime.current = Math.min(animTime.current + delta * speed, preset.duration || 0.001);
    }
  });

  usePostureRig(skeleton, posture, animationId, animTime);

  return null;
}
