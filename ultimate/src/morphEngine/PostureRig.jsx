/**
 * GrowthTrack Ultimate — Layer 3: Parametric Morph Engine
 * PostureRig.jsx
 *
 * Applies posture offset metrics to the skeleton's bone rotations.
 * Runs in useFrame — smooth lerps to target posture.
 *
 * Tracked posture metrics (from store):
 *   headTiltAngle     → Head bone: forward X rotation (degrees)
 *   pelvicTilt        → Hips bone: anterior tilt (degrees)
 *   shoulderRounding  → Left/Right shoulder bones: forward Y rotation (degrees)
 *
 * Bone names follow Mixamo/ReadyPlayerMe convention.
 * If your GLB uses different names, update BONE_MAP below.
 *
 * Usage: <PostureRig skeleton={skeleton} posture={clonePosture} />
 */

import { useRef, useEffect } from "react";
import { useFrame }          from "@react-three/fiber";
import * as THREE            from "three";

// ─────────────────────────────────────────────────────────────────────────────
// BONE NAME MAP — Mixamo/ReadyPlayerMe convention
// ─────────────────────────────────────────────────────────────────────────────

const BONE_MAP = {
  head:           ["Head",            "mixamorigHead"],
  hips:           ["Hips",            "mixamorigHips"],
  spine:          ["Spine",           "mixamorigSpine"],
  spine1:         ["Spine1",          "mixamorigSpine1"],
  spine2:         ["Spine2",          "mixamorigSpine2"],
  leftShoulder:   ["LeftShoulder",    "mixamorigLeftShoulder"],
  rightShoulder:  ["RightShoulder",   "mixamorigRightShoulder"],
  neck:           ["Neck",            "mixamorigNeck"],
};

/**
 * Finds a bone by trying multiple name variants.
 * @param {THREE.Skeleton} skeleton
 * @param {string[]} names
 * @returns {THREE.Bone | null}
 */
function findBone(skeleton, names) {
  if (!skeleton) return null;
  for (const name of names) {
    const bone = skeleton.bones.find((b) => b.name === name);
    if (bone) return bone;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POSTURE TARGETS → EULER ROTATIONS
// ─────────────────────────────────────────────────────────────────────────────

/** Converts posture metrics to per-bone target Euler rotations (radians) */
function postureToRotations(posture) {
  const deg = THREE.MathUtils.degToRad;

  return {
    // Head tilts forward around X axis
    head: new THREE.Euler(
      deg(posture.headTiltAngle * 0.7),   // forward tilt (70% on head)
      0,
      0,
      "XYZ"
    ),

    // Neck carries remaining 30% of head tilt
    neck: new THREE.Euler(
      deg(posture.headTiltAngle * 0.3),
      0,
      0,
      "XYZ"
    ),

    // Anterior pelvic tilt rotates hips forward (negative X in local space)
    hips: new THREE.Euler(
      deg(-posture.pelvicTilt * 0.6),
      0,
      0,
      "XYZ"
    ),

    // Compensatory lumbar curve in spine1
    spine1: new THREE.Euler(
      deg(posture.pelvicTilt * 0.3),
      0,
      0,
      "XYZ"
    ),

    // Shoulders round forward (positive Z in local space)
    leftShoulder: new THREE.Euler(
      0,
      0,
      deg(-posture.shoulderRounding * 0.5),
      "XYZ"
    ),

    rightShoulder: new THREE.Euler(
      0,
      0,
      deg(posture.shoulderRounding * 0.5),
      "XYZ"
    ),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POSTURE RIG HOOK
// ─────────────────────────────────────────────────────────────────────────────

const POSTURE_LERP = 0.05; // slightly slower than morph for natural bone movement

/**
 * Frame-rate-independent lerp factor for posture.
 */
function adaptiveLerp(delta, base = POSTURE_LERP) {
  const frames = delta / (1 / 60);
  return 1 - Math.pow(1 - base, frames);
}

/**
 * @param {Object} props
 * @param {THREE.Skeleton | null} props.skeleton
 * @param {{ headTiltAngle: number, pelvicTilt: number, shoulderRounding: number }} props.posture
 */
export function usePostureRig(skeleton, posture) {
  // Resolved bone refs — cached after first skeleton traversal
  const bonesRef = useRef({});

  // Current rotation state (what's applied to bones right now)
  const currentRotations = useRef({});

  // Resolve bones whenever skeleton changes
  useEffect(() => {
    if (!skeleton) return;

    bonesRef.current = {
      head:          findBone(skeleton, BONE_MAP.head),
      neck:          findBone(skeleton, BONE_MAP.neck),
      hips:          findBone(skeleton, BONE_MAP.hips),
      spine1:        findBone(skeleton, BONE_MAP.spine1),
      leftShoulder:  findBone(skeleton, BONE_MAP.leftShoulder),
      rightShoulder: findBone(skeleton, BONE_MAP.rightShoulder),
    };

    // Initialise current rotations from bone rest pose
    for (const [key, bone] of Object.entries(bonesRef.current)) {
      if (bone) {
        currentRotations.current[key] = bone.rotation.clone();
      }
    }
  }, [skeleton]);

  // Per-frame: lerp bone rotations toward posture targets
  useFrame((_, delta) => {
    const bones   = bonesRef.current;
    const targets = postureToRotations(posture);
    const factor  = adaptiveLerp(delta);

    for (const [key, targetEuler] of Object.entries(targets)) {
      const bone = bones[key];
      if (!bone) continue;

      // Lerp each rotation axis
      bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, targetEuler.x, factor);
      bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, targetEuler.y, factor);
      bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, targetEuler.z, factor);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PostureRig — React component wrapper (renders nothing, just runs the hook)
// ─────────────────────────────────────────────────────────────────────────────

export default function PostureRig({ skeleton, posture }) {
  usePostureRig(skeleton, posture);
  return null;
}
