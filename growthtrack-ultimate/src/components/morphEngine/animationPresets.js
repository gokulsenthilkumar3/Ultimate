/**
 * GrowthTrack Ultimate — Animation Presets
 * animationPresets.js
 *
 * Keyframe animation library for the procedural humanoid.
 * Each preset defines bone rotations (in radians) for named pose frames.
 * The AnimationEngine interpolates between frames at runtime.
 *
 * Bone names match the BONE_MAP in PostureRig.jsx:
 *   head, neck, hips, spine1, spine2,
 *   leftShoulder, rightShoulder,
 *   leftUpperArm, rightUpperArm,
 *   leftForeArm, rightForeArm,
 *   leftHand, rightHand,
 *   leftThigh, rightThigh,
 *   leftShin, rightShin,
 *   leftFoot, rightFoot
 *
 * Each keyframe has:
 *   t        — time in seconds
 *   bones    — map of boneName -> [rx, ry, rz] Euler angles (radians)
 *   easing   — 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'
 */

import * as THREE from 'three';

const deg = THREE.MathUtils.degToRad;

// ─────────────────────────────────────────────────────────────────────────────
// STANDING (T-pose rest)
// ─────────────────────────────────────────────────────────────────────────────
export const POSE_STANDING = {
  id: 'standing',
  label: 'Standing',
  icon: '🧍',
  loop: false,
  duration: 0,
  frames: [
    {
      t: 0,
      bones: {
        head:         [0, 0, 0],
        neck:         [0, 0, 0],
        hips:         [0, 0, 0],
        spine1:       [0, 0, 0],
        spine2:       [0, 0, 0],
        leftShoulder:  [0, 0, deg(5)],
        rightShoulder: [0, 0, deg(-5)],
        leftUpperArm:  [0, 0, deg(8)],
        rightUpperArm: [0, 0, deg(-8)],
        leftForeArm:   [0, 0, 0],
        rightForeArm:  [0, 0, 0],
        leftHand:      [0, 0, 0],
        rightHand:     [0, 0, 0],
        leftThigh:     [0, 0, 0],
        rightThigh:    [0, 0, 0],
        leftShin:      [0, 0, 0],
        rightShin:     [0, 0, 0],
        leftFoot:      [deg(5), 0, 0],
        rightFoot:     [deg(5), 0, 0],
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// RELAXED IDLE — natural standing with subtle weight shift
// ─────────────────────────────────────────────────────────────────────────────
export const POSE_IDLE = {
  id: 'idle',
  label: 'Idle',
  icon: '🧍',
  loop: true,
  duration: 4.0,
  frames: [
    {
      t: 0,
      easing: 'ease-in-out',
      bones: {
        head:          [deg(2), deg(-3), deg(-1)],
        neck:          [deg(1), deg(-1), 0],
        hips:          [0, deg(3), 0],
        spine1:        [deg(2), 0, 0],
        spine2:        [deg(1), 0, 0],
        leftShoulder:  [0, 0, deg(6)],
        rightShoulder: [0, 0, deg(-6)],
        leftUpperArm:  [deg(5), 0, deg(12)],
        rightUpperArm: [deg(5), 0, deg(-12)],
        leftForeArm:   [deg(8), 0, 0],
        rightForeArm:  [deg(8), 0, 0],
        leftHand:      [deg(-5), deg(-3), 0],
        rightHand:     [deg(-5), deg(3), 0],
        leftThigh:     [deg(2), 0, 0],
        rightThigh:    [deg(-1), 0, 0],
        leftShin:      [deg(-2), 0, 0],
        rightShin:     [0, 0, 0],
        leftFoot:      [deg(8), 0, 0],
        rightFoot:     [deg(5), 0, 0],
      },
    },
    {
      t: 2.0,
      easing: 'ease-in-out',
      bones: {
        head:          [deg(-1), deg(4), deg(1)],
        neck:          [deg(-1), deg(2), 0],
        hips:          [0, deg(-3), 0],
        spine1:        [deg(1), 0, 0],
        spine2:        [0, 0, 0],
        leftShoulder:  [0, 0, deg(6)],
        rightShoulder: [0, 0, deg(-6)],
        leftUpperArm:  [deg(3), 0, deg(14)],
        rightUpperArm: [deg(4), 0, deg(-10)],
        leftForeArm:   [deg(10), 0, 0],
        rightForeArm:  [deg(6), 0, 0],
        leftHand:      [deg(-3), deg(2), 0],
        rightHand:     [deg(-4), deg(-2), 0],
        leftThigh:     [deg(-1), 0, 0],
        rightThigh:    [deg(2), 0, 0],
        leftShin:      [0, 0, 0],
        rightShin:     [deg(-2), 0, 0],
        leftFoot:      [deg(5), 0, 0],
        rightFoot:     [deg(8), 0, 0],
      },
    },
    {
      t: 4.0,
      easing: 'ease-in-out',
      bones: {
        head:          [deg(2), deg(-3), deg(-1)],
        neck:          [deg(1), deg(-1), 0],
        hips:          [0, deg(3), 0],
        spine1:        [deg(2), 0, 0],
        spine2:        [deg(1), 0, 0],
        leftShoulder:  [0, 0, deg(6)],
        rightShoulder: [0, 0, deg(-6)],
        leftUpperArm:  [deg(5), 0, deg(12)],
        rightUpperArm: [deg(5), 0, deg(-12)],
        leftForeArm:   [deg(8), 0, 0],
        rightForeArm:  [deg(8), 0, 0],
        leftHand:      [deg(-5), deg(-3), 0],
        rightHand:     [deg(-5), deg(3), 0],
        leftThigh:     [deg(2), 0, 0],
        rightThigh:    [deg(-1), 0, 0],
        leftShin:      [deg(-2), 0, 0],
        rightShin:     [0, 0, 0],
        leftFoot:      [deg(8), 0, 0],
        rightFoot:     [deg(5), 0, 0],
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SITTING — seated pose
// ─────────────────────────────────────────────────────────────────────────────
export const POSE_SITTING = {
  id: 'sitting',
  label: 'Sitting',
  icon: '🪑',
  loop: false,
  duration: 0,
  frames: [
    {
      t: 0,
      bones: {
        head:          [deg(5), 0, 0],
        neck:          [deg(3), 0, 0],
        hips:          [deg(-85), 0, 0],
        spine1:        [deg(15), 0, 0],
        spine2:        [deg(5), 0, 0],
        leftShoulder:  [0, 0, deg(8)],
        rightShoulder: [0, 0, deg(-8)],
        leftUpperArm:  [deg(-10), 0, deg(15)],
        rightUpperArm: [deg(-10), 0, deg(-15)],
        leftForeArm:   [deg(80), 0, 0],
        rightForeArm:  [deg(80), 0, 0],
        leftHand:      [deg(-10), 0, 0],
        rightHand:     [deg(-10), 0, 0],
        leftThigh:     [deg(90), 0, deg(5)],
        rightThigh:    [deg(90), 0, deg(-5)],
        leftShin:      [deg(-95), 0, 0],
        rightShin:     [deg(-95), 0, 0],
        leftFoot:      [deg(-5), 0, 0],
        rightFoot:     [deg(-5), 0, 0],
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// WALKING — 2-frame cycle
// ─────────────────────────────────────────────────────────────────────────────
export const ANIM_WALKING = {
  id: 'walking',
  label: 'Walking',
  icon: '🚶',
  loop: true,
  duration: 1.0,  // full cycle in seconds
  frames: [
    {
      t: 0,
      easing: 'ease-in-out',
      bones: {
        head:          [0, deg(-5), 0],
        neck:          [0, deg(-2), 0],
        hips:          [0, deg(8), deg(4)],
        spine1:        [deg(3), deg(-4), 0],
        spine2:        [deg(2), 0, 0],
        leftShoulder:  [0, 0, deg(6)],
        rightShoulder: [0, 0, deg(-6)],
        leftUpperArm:  [deg(-28), 0, deg(8)],
        rightUpperArm: [deg(32), 0, deg(-8)],
        leftForeArm:   [deg(35), 0, 0],
        rightForeArm:  [deg(18), 0, 0],
        leftHand:      [deg(-5), deg(10), 0],
        rightHand:     [deg(-5), deg(-10), 0],
        leftThigh:     [deg(-30), 0, 0],
        rightThigh:    [deg(28), 0, 0],
        leftShin:      [deg(5), 0, 0],
        rightShin:     [deg(-35), 0, 0],
        leftFoot:      [deg(-15), 0, 0],
        rightFoot:     [deg(15), 0, 0],
      },
    },
    {
      t: 0.5,
      easing: 'ease-in-out',
      bones: {
        head:          [0, deg(5), 0],
        neck:          [0, deg(2), 0],
        hips:          [0, deg(-8), deg(-4)],
        spine1:        [deg(3), deg(4), 0],
        spine2:        [deg(2), 0, 0],
        leftShoulder:  [0, 0, deg(6)],
        rightShoulder: [0, 0, deg(-6)],
        leftUpperArm:  [deg(32), 0, deg(8)],
        rightUpperArm: [deg(-28), 0, deg(-8)],
        leftForeArm:   [deg(18), 0, 0],
        rightForeArm:  [deg(35), 0, 0],
        leftHand:      [deg(-5), deg(-10), 0],
        rightHand:     [deg(-5), deg(10), 0],
        leftThigh:     [deg(28), 0, 0],
        rightThigh:    [deg(-30), 0, 0],
        leftShin:      [deg(-35), 0, 0],
        rightShin:     [deg(5), 0, 0],
        leftFoot:      [deg(15), 0, 0],
        rightFoot:     [deg(-15), 0, 0],
      },
    },
    {
      t: 1.0,
      easing: 'ease-in-out',
      bones: {
        head:          [0, deg(-5), 0],
        neck:          [0, deg(-2), 0],
        hips:          [0, deg(8), deg(4)],
        spine1:        [deg(3), deg(-4), 0],
        spine2:        [deg(2), 0, 0],
        leftShoulder:  [0, 0, deg(6)],
        rightShoulder: [0, 0, deg(-6)],
        leftUpperArm:  [deg(-28), 0, deg(8)],
        rightUpperArm: [deg(32), 0, deg(-8)],
        leftForeArm:   [deg(35), 0, 0],
        rightForeArm:  [deg(18), 0, 0],
        leftHand:      [deg(-5), deg(10), 0],
        rightHand:     [deg(-5), deg(-10), 0],
        leftThigh:     [deg(-30), 0, 0],
        rightThigh:    [deg(28), 0, 0],
        leftShin:      [deg(5), 0, 0],
        rightShin:     [deg(-35), 0, 0],
        leftFoot:      [deg(-15), 0, 0],
        rightFoot:     [deg(15), 0, 0],
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// RUNNING — fast gait cycle
// ─────────────────────────────────────────────────────────────────────────────
export const ANIM_RUNNING = {
  id: 'running',
  label: 'Running',
  icon: '🏃',
  loop: true,
  duration: 0.6,
  frames: [
    {
      t: 0,
      easing: 'ease-in-out',
      bones: {
        head:          [deg(-8), deg(-6), 0],
        neck:          [deg(-5), deg(-3), 0],
        hips:          [deg(-12), deg(15), deg(8)],
        spine1:        [deg(8), deg(-8), 0],
        spine2:        [deg(5), 0, 0],
        leftShoulder:  [0, 0, deg(8)],
        rightShoulder: [0, 0, deg(-8)],
        leftUpperArm:  [deg(-58), 0, deg(12)],
        rightUpperArm: [deg(68), 0, deg(-12)],
        leftForeArm:   [deg(85), 0, 0],
        rightForeArm:  [deg(55), 0, 0],
        leftHand:      [deg(-8), deg(18), 0],
        rightHand:     [deg(-5), deg(-18), 0],
        leftThigh:     [deg(-55), 0, 0],
        rightThigh:    [deg(68), 0, 0],
        leftShin:      [deg(10), 0, 0],
        rightShin:     [deg(-80), 0, 0],
        leftFoot:      [deg(-20), 0, 0],
        rightFoot:     [deg(25), 0, 0],
      },
    },
    {
      t: 0.3,
      easing: 'ease-in-out',
      bones: {
        head:          [deg(-8), deg(6), 0],
        neck:          [deg(-5), deg(3), 0],
        hips:          [deg(-12), deg(-15), deg(-8)],
        spine1:        [deg(8), deg(8), 0],
        spine2:        [deg(5), 0, 0],
        leftShoulder:  [0, 0, deg(8)],
        rightShoulder: [0, 0, deg(-8)],
        leftUpperArm:  [deg(68), 0, deg(12)],
        rightUpperArm: [deg(-58), 0, deg(-12)],
        leftForeArm:   [deg(55), 0, 0],
        rightForeArm:  [deg(85), 0, 0],
        leftHand:      [deg(-5), deg(-18), 0],
        rightHand:     [deg(-8), deg(18), 0],
        leftThigh:     [deg(68), 0, 0],
        rightThigh:    [deg(-55), 0, 0],
        leftShin:      [deg(-80), 0, 0],
        rightShin:     [deg(10), 0, 0],
        leftFoot:      [deg(25), 0, 0],
        rightFoot:     [deg(-20), 0, 0],
      },
    },
    {
      t: 0.6,
      easing: 'ease-in-out',
      bones: {
        head:          [deg(-8), deg(-6), 0],
        neck:          [deg(-5), deg(-3), 0],
        hips:          [deg(-12), deg(15), deg(8)],
        spine1:        [deg(8), deg(-8), 0],
        spine2:        [deg(5), 0, 0],
        leftShoulder:  [0, 0, deg(8)],
        rightShoulder: [0, 0, deg(-8)],
        leftUpperArm:  [deg(-58), 0, deg(12)],
        rightUpperArm: [deg(68), 0, deg(-12)],
        leftForeArm:   [deg(85), 0, 0],
        rightForeArm:  [deg(55), 0, 0],
        leftHand:      [deg(-8), deg(18), 0],
        rightHand:     [deg(-5), deg(-18), 0],
        leftThigh:     [deg(-55), 0, 0],
        rightThigh:    [deg(68), 0, 0],
        leftShin:      [deg(10), 0, 0],
        rightShin:     [deg(-80), 0, 0],
        leftFoot:      [deg(-20), 0, 0],
        rightFoot:     [deg(25), 0, 0],
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// T-POSE — calibration / inspection pose
// ─────────────────────────────────────────────────────────────────────────────
export const POSE_TPOSE = {
  id: 'tpose',
  label: 'T-Pose',
  icon: '✝️',
  loop: false,
  duration: 0,
  frames: [
    {
      t: 0,
      bones: {
        head:          [0, 0, 0],
        neck:          [0, 0, 0],
        hips:          [0, 0, 0],
        spine1:        [0, 0, 0],
        spine2:        [0, 0, 0],
        leftShoulder:  [0, 0, 0],
        rightShoulder: [0, 0, 0],
        leftUpperArm:  [0, 0, deg(90)],
        rightUpperArm: [0, 0, deg(-90)],
        leftForeArm:   [0, 0, 0],
        rightForeArm:  [0, 0, 0],
        leftHand:      [0, 0, 0],
        rightHand:     [0, 0, 0],
        leftThigh:     [0, 0, 0],
        rightThigh:    [0, 0, 0],
        leftShin:      [0, 0, 0],
        rightShin:     [0, 0, 0],
        leftFoot:      [0, 0, 0],
        rightFoot:     [0, 0, 0],
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// JUMPING JACK — peak position
// ─────────────────────────────────────────────────────────────────────────────
export const ANIM_JUMPING = {
  id: 'jumping',
  label: 'Jumping Jack',
  icon: '⭐',
  loop: true,
  duration: 1.2,
  frames: [
    {
      t: 0,
      easing: 'ease-in-out',
      bones: {
        head:          [0, 0, 0],
        neck:          [0, 0, 0],
        hips:          [0, 0, 0],
        spine1:        [0, 0, 0],
        spine2:        [0, 0, 0],
        leftShoulder:  [0, 0, deg(5)],
        rightShoulder: [0, 0, deg(-5)],
        leftUpperArm:  [0, 0, deg(10)],
        rightUpperArm: [0, 0, deg(-10)],
        leftForeArm:   [0, 0, 0],
        rightForeArm:  [0, 0, 0],
        leftHand:      [0, 0, 0],
        rightHand:     [0, 0, 0],
        leftThigh:     [0, 0, 0],
        rightThigh:    [0, 0, 0],
        leftShin:      [0, 0, 0],
        rightShin:     [0, 0, 0],
        leftFoot:      [0, 0, 0],
        rightFoot:     [0, 0, 0],
      },
    },
    {
      t: 0.6,
      easing: 'ease-out',
      bones: {
        head:          [0, 0, 0],
        neck:          [0, 0, 0],
        hips:          [0, 0, 0],
        spine1:        [0, 0, 0],
        spine2:        [0, 0, 0],
        leftShoulder:  [0, 0, deg(5)],
        rightShoulder: [0, 0, deg(-5)],
        leftUpperArm:  [0, 0, deg(82)],
        rightUpperArm: [0, 0, deg(-82)],
        leftForeArm:   [0, 0, 0],
        rightForeArm:  [0, 0, 0],
        leftHand:      [0, 0, 0],
        rightHand:     [0, 0, 0],
        leftThigh:     [0, 0, deg(32)],
        rightThigh:    [0, 0, deg(-32)],
        leftShin:      [0, 0, 0],
        rightShin:     [0, 0, 0],
        leftFoot:      [deg(5), 0, 0],
        rightFoot:     [deg(5), 0, 0],
      },
    },
    {
      t: 1.2,
      easing: 'ease-in',
      bones: {
        head:          [0, 0, 0],
        neck:          [0, 0, 0],
        hips:          [0, 0, 0],
        spine1:        [0, 0, 0],
        spine2:        [0, 0, 0],
        leftShoulder:  [0, 0, deg(5)],
        rightShoulder: [0, 0, deg(-5)],
        leftUpperArm:  [0, 0, deg(10)],
        rightUpperArm: [0, 0, deg(-10)],
        leftForeArm:   [0, 0, 0],
        rightForeArm:  [0, 0, 0],
        leftHand:      [0, 0, 0],
        rightHand:     [0, 0, 0],
        leftThigh:     [0, 0, 0],
        rightThigh:    [0, 0, 0],
        leftShin:      [0, 0, 0],
        rightShin:     [0, 0, 0],
        leftFoot:      [0, 0, 0],
        rightFoot:     [0, 0, 0],
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// FLEX — bicep flex pose
// ─────────────────────────────────────────────────────────────────────────────
export const POSE_FLEX = {
  id: 'flex',
  label: 'Flex',
  icon: '💪',
  loop: false,
  duration: 0,
  frames: [
    {
      t: 0,
      bones: {
        head:          [deg(2), 0, 0],
        neck:          [deg(1), 0, 0],
        hips:          [deg(5), 0, 0],
        spine1:        [deg(-3), 0, 0],
        spine2:        [deg(-2), 0, 0],
        leftShoulder:  [0, 0, deg(25)],
        rightShoulder: [0, 0, deg(-25)],
        leftUpperArm:  [deg(15), 0, deg(62)],
        rightUpperArm: [deg(15), 0, deg(-62)],
        leftForeArm:   [deg(105), 0, 0],
        rightForeArm:  [deg(105), 0, 0],
        leftHand:      [deg(10), 0, deg(-15)],
        rightHand:     [deg(10), 0, deg(15)],
        leftThigh:     [0, 0, deg(3)],
        rightThigh:    [0, 0, deg(-3)],
        leftShin:      [0, 0, 0],
        rightShin:     [0, 0, 0],
        leftFoot:      [deg(5), 0, 0],
        rightFoot:     [deg(5), 0, 0],
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// SQUAT — deep squat for physique display
// ─────────────────────────────────────────────────────────────────────────────
export const POSE_SQUAT = {
  id: 'squat',
  label: 'Squat',
  icon: '🏋️',
  loop: false,
  duration: 0,
  frames: [
    {
      t: 0,
      bones: {
        head:          [deg(-5), 0, 0],
        neck:          [deg(-3), 0, 0],
        hips:          [deg(-65), 0, 0],
        spine1:        [deg(20), 0, 0],
        spine2:        [deg(10), 0, 0],
        leftShoulder:  [0, 0, deg(10)],
        rightShoulder: [0, 0, deg(-10)],
        leftUpperArm:  [deg(-15), 0, deg(30)],
        rightUpperArm: [deg(-15), 0, deg(-30)],
        leftForeArm:   [deg(90), 0, 0],
        rightForeArm:  [deg(90), 0, 0],
        leftHand:      [0, 0, 0],
        rightHand:     [0, 0, 0],
        leftThigh:     [deg(80), 0, deg(15)],
        rightThigh:    [deg(80), 0, deg(-15)],
        leftShin:      [deg(-110), 0, 0],
        rightShin:     [deg(-110), 0, 0],
        leftFoot:      [deg(-25), 0, 0],
        rightFoot:     [deg(-25), 0, 0],
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// WAVE — friendly greeting
// ─────────────────────────────────────────────────────────────────────────────
export const ANIM_WAVE = {
  id: 'wave',
  label: 'Wave',
  icon: '👋',
  loop: true,
  duration: 1.4,
  frames: [
    {
      t: 0,
      easing: 'ease-in-out',
      bones: {
        head:          [0, deg(8), 0],
        neck:          [0, deg(4), 0],
        hips:          [0, 0, 0],
        spine1:        [0, 0, 0],
        spine2:        [0, 0, 0],
        leftShoulder:  [0, 0, deg(6)],
        rightShoulder: [0, 0, deg(-8)],
        leftUpperArm:  [0, 0, deg(10)],
        rightUpperArm: [deg(-135), 0, deg(-12)],
        leftForeArm:   [0, 0, 0],
        rightForeArm:  [deg(15), 0, 0],
        leftHand:      [0, 0, 0],
        rightHand:     [0, deg(-15), deg(-25)],
        leftThigh:     [0, 0, 0],
        rightThigh:    [0, 0, 0],
        leftShin:      [0, 0, 0],
        rightShin:     [0, 0, 0],
        leftFoot:      [0, 0, 0],
        rightFoot:     [0, 0, 0],
      },
    },
    {
      t: 0.7,
      easing: 'ease-in-out',
      bones: {
        head:          [0, deg(8), 0],
        neck:          [0, deg(4), 0],
        hips:          [0, 0, 0],
        spine1:        [0, 0, 0],
        spine2:        [0, 0, 0],
        leftShoulder:  [0, 0, deg(6)],
        rightShoulder: [0, 0, deg(-8)],
        leftUpperArm:  [0, 0, deg(10)],
        rightUpperArm: [deg(-135), 0, deg(-12)],
        leftForeArm:   [0, 0, 0],
        rightForeArm:  [deg(15), 0, 0],
        leftHand:      [0, 0, 0],
        rightHand:     [0, deg(20), deg(25)],
        leftThigh:     [0, 0, 0],
        rightThigh:    [0, 0, 0],
        leftShin:      [0, 0, 0],
        rightShin:     [0, 0, 0],
        leftFoot:      [0, 0, 0],
        rightFoot:     [0, 0, 0],
      },
    },
    {
      t: 1.4,
      easing: 'ease-in-out',
      bones: {
        head:          [0, deg(8), 0],
        neck:          [0, deg(4), 0],
        hips:          [0, 0, 0],
        spine1:        [0, 0, 0],
        spine2:        [0, 0, 0],
        leftShoulder:  [0, 0, deg(6)],
        rightShoulder: [0, 0, deg(-8)],
        leftUpperArm:  [0, 0, deg(10)],
        rightUpperArm: [deg(-135), 0, deg(-12)],
        leftForeArm:   [0, 0, 0],
        rightForeArm:  [deg(15), 0, 0],
        leftHand:      [0, 0, 0],
        rightHand:     [0, deg(-15), deg(-25)],
        leftThigh:     [0, 0, 0],
        rightThigh:    [0, 0, 0],
        leftShin:      [0, 0, 0],
        rightShin:     [0, 0, 0],
        leftFoot:      [0, 0, 0],
        rightFoot:     [0, 0, 0],
      },
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// ALL PRESETS — registered catalog
// ─────────────────────────────────────────────────────────────────────────────
export const ANIMATION_PRESETS = [
  POSE_STANDING,
  POSE_IDLE,
  POSE_SITTING,
  ANIM_WALKING,
  ANIM_RUNNING,
  POSE_TPOSE,
  ANIM_JUMPING,
  POSE_FLEX,
  POSE_SQUAT,
  ANIM_WAVE,
];

export const ANIMATION_PRESET_MAP = Object.fromEntries(
  ANIMATION_PRESETS.map((p) => [p.id, p])
);

// ─────────────────────────────────────────────────────────────────────────────
// EASING FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────
export function applyEasing(t, type = 'ease-in-out') {
  switch (type) {
    case 'linear': return t;
    case 'ease-in': return t * t;
    case 'ease-out': return 1 - (1 - t) * (1 - t);
    case 'ease-in-out':
    default:
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// KEYFRAME SAMPLER — get bone rotations at a given time
// Returns { boneName: [rx, ry, rz] } for all bones in the animation
// ─────────────────────────────────────────────────────────────────────────────
export function sampleAnimation(preset, time) {
  if (!preset || !preset.frames || preset.frames.length === 0) return {};

  const { frames, duration, loop } = preset;

  // Single frame: just return that frame
  if (frames.length === 1) return frames[0].bones || {};

  // Wrap time for looping animations
  let t = time;
  if (loop && duration > 0) {
    t = ((time % duration) + duration) % duration;
  } else {
    t = Math.min(time, duration);
  }

  // Find surrounding keyframes
  let frameA = frames[0];
  let frameB = frames[1];
  for (let i = 0; i < frames.length - 1; i++) {
    if (t >= frames[i].t && t <= frames[i + 1].t) {
      frameA = frames[i];
      frameB = frames[i + 1];
      break;
    }
  }

  // Interpolation factor
  const segDuration = frameB.t - frameA.t;
  const rawT = segDuration > 0 ? (t - frameA.t) / segDuration : 0;
  const easedT = applyEasing(rawT, frameB.easing || 'ease-in-out');

  // Interpolate each bone
  const result = {};
  const bonesA = frameA.bones || {};
  const bonesB = frameB.bones || {};
  const allBones = new Set([...Object.keys(bonesA), ...Object.keys(bonesB)]);

  for (const bone of allBones) {
    const a = bonesA[bone] || [0, 0, 0];
    const b = bonesB[bone] || [0, 0, 0];
    result[bone] = [
      a[0] + (b[0] - a[0]) * easedT,
      a[1] + (b[1] - a[1]) * easedT,
      a[2] + (b[2] - a[2]) * easedT,
    ];
  }

  return result;
}
