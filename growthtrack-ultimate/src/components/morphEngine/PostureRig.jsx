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
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { postureOffsets } from './postureMath';
import { sampleAnimation, ANIMATION_PRESET_MAP } from './animationPresets';
import { applyJointPose, applyReachTargets, freezeJointPose } from './poseRuntime';
import { registerCaptureGuard } from './captureRuntime';
import { resolveRigBones } from './boneMap';
import {applyArticulation,applyTwistBindings} from './articulation';
import {createMorphRig} from './morphRig';
import {applyPresetReach,retargetPresetAngles} from './presetRetargeting';

// ─────────────────────────────────────────────────────────────────────────────
// EXTENDED BONE MAP — supports hands, legs, feet, spine, hair
// Each entry: canonical key -> [possible bone names in authored GLB assets]
// ─────────────────────────────────────────────────────────────────────────────

// Smooth transition speed (higher = snappier)
const LERP_SPEED = 4.5;

/**
 * Core hook: resolves skeleton bones, applies posture + animation offsets every frame.
 */
function usePostureRig(skeleton, posture, animationId, animTime, idleSample, pose, bodyMesh, neutral, onPoseApplied, sampleTime) {
  const euler = useMemo(() => new THREE.Euler(), []);
  const renderer=useThree(state=>state.gl);
  const updateMorphRig=useMemo(()=>createMorphRig(bodyMesh),[bodyMesh]);
  const digitGroups=useMemo(()=>[...new Set((skeleton?.bones || []).map(bone=>bone.userData.digitBinding?.group).filter(Boolean))],[skeleton]);

  // Resolve bones from skeleton
  const bones = useMemo(() => {
    if (!skeleton?.bones) return {};
    const resolved = resolveRigBones(skeleton);
    return Object.fromEntries(
      Object.keys(resolved).map(key => {
        const bone = resolved[key];
        if (!bone) return [key, null];
        return [key, {
          bone,
          rest: bone.quaternion.clone(),
          restScale: bone.scale.clone(),
          target: new THREE.Quaternion(),
        }];
      })
    );
  }, [skeleton]);

  // Restore rest pose on unmount / skeleton change
  useEffect(() => {
    return () => {
      Object.values(bones).forEach((item) => {
        if (item) { item.bone.quaternion.copy(item.rest);item.bone.scale.copy(item.restScale); }
      });
    };
  }, [bones]);

  useEffect(()=>registerCaptureGuard(renderer.domElement,()=>{
    updateMorphRig();
    const restore=pose?freezeJointPose(bones,pose,postureOffsets(posture),onPoseApplied):()=>{};
    onPoseApplied?.();
    return {restore,afterRestore:()=>{updateMorphRig();onPoseApplied?.();}};
  }),[renderer,bones,pose,posture,onPoseApplied,updateMorphRig]);

  // Per-frame: combine posture + animation
  useFrame((_, delta) => {
    updateMorphRig();
    if(pose) {
      const limbs=applyJointPose(bones,pose,postureOffsets(posture));
      onPoseApplied?.();
      // Three.js scene metadata is owned by the imperative render loop.
      // eslint-disable-next-line react-hooks/immutability
      if(bodyMesh)bodyMesh.userData.poseEvidence={active:true,rigJoints:skeleton.bones.length,digitGroups,joints:pose.joints,targets:pose.targets,digits:pose.digits || {},limbs,
        rotations:Object.fromEntries(Object.entries(bones).filter(([,item])=>item).map(([key,item])=>[key,item.bone.quaternion.toArray()]))};
      return;
    }
    const factor = 1 - Math.exp(-Math.max(0, delta) * LERP_SPEED);

    // 1. Posture offsets from measurements (low-frequency changes)
    const postureOff = postureOffsets(posture);

    // 2. Animation frame sample (high-frequency keyframe animation)
    const preset = ANIMATION_PRESET_MAP[animationId==='idle' && idleSample?'standing':animationId];
    const sampledTime=Number.isFinite(sampleTime)?sampleTime:animTime.current;
    const animBones = sampleAnimation(preset, sampledTime);

    // Apply both layers to every bone touched by either source.
    const allBoneKeys = Object.keys(bones);

    for (const key of allBoneKeys) {
      const item = bones[key];
      if (!item) continue;

      const postureAngles = postureOff[key] || [0, 0, 0];
      const animAngles = bodyMesh?.userData.growthtrack?.previewVersion===75?retargetPresetAngles(key,animBones[key],preset?.id):animBones[key] || null;

      // Measurements are posture offsets, not a competing animation layer.
      const [rx, ry, rz] = postureAngles.map((value,i)=>value+(animAngles?.[i] || 0));

      item.target
        .setFromEuler(euler.set(rx, ry, rz))
        .premultiply(item.rest);

      if(neutral)item.bone.quaternion.copy(item.target);else item.bone.quaternion.slerp(item.target, factor);
      item.bone.scale.copy(item.restScale);
      if(key==='spine2') {
        const breath=idleSample?.current?.breath || 0;
        item.bone.scale.set(item.restScale.x*(1+breath*.004),item.restScale.y,item.restScale.z*(1+breath*.008));
      }
    }
    const retargeted=bodyMesh?.userData.growthtrack?.previewVersion===75?applyPresetReach(bones,preset,sampledTime):null;
    applyArticulation(bones,preset?.id==='flex'?{leftHand:{shape:'fist',strength:1},rightHand:{shape:'fist',strength:1}}:null);applyTwistBindings(bones);
    if(bodyMesh)bodyMesh.userData.poseEvidence={active:false,animationId,sampleTime:sampledTime,rigJoints:skeleton.bones.length,digitGroups,joints:{},digits:{},limbs:retargeted || applyReachTargets(bones),
      rotations:Object.fromEntries(Object.entries(bones).filter(([,item])=>item).map(([key,item])=>[key,item.bone.quaternion.toArray()]))};
    onPoseApplied?.();
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
export default function PostureRig({ skeleton, posture, animationId = 'idle', playing = true, speed = 1, idleSample, pose=null, bodyMesh, neutral=false, onPoseApplied, sampleTime=null }) {
  const animTime = useRef(0);
  const preset = ANIMATION_PRESET_MAP[animationId];

  useEffect(()=>{animTime.current=0;},[animationId]);

  // Advance animation time
  useFrame((_, delta) => {
    if (!playing || !preset) return;
    if (preset.loop && preset.duration > 0) {
      animTime.current = (animTime.current + delta * speed) % preset.duration;
    } else if (!preset.loop) {
      animTime.current = Math.min(animTime.current + delta * speed, preset.duration || 0.001);
    }
  });

  usePostureRig(skeleton, posture, animationId, animTime, idleSample, pose, bodyMesh, neutral, onPoseApplied, sampleTime);

  return null;
}
