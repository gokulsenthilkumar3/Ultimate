/**
 * GrowthTrack Ultimate — Layer 3: Parametric Morph Engine
 * HumanoidClone.jsx
 *
 * A single rendered clone of the humanoid model.
 * Each clone:
 *   1. Loads a cloned GLB mesh (independent morphTargetInfluences)
 *   2. Runs MorphInterpolator in useFrame to animate blend shapes
 *   3. Applies PostureRig for bone-level posture corrections
 *   4. Receives shader uniforms for skin tone + vascularity (Layer 4 materials)
 *   5. Accepts position, opacity, and renderMode props from CloneEngine
 *
 * Props:
 *   cloneKey        "A" | "B"        — which store slice to read
 *   position        [x, y, z]        — world position (CloneEngine places it)
 *   opacity         0–1              — for GHOST mode
 *   snapWeights     boolean          — true = no lerp (goal clone)
 *   renderMode      "normal" | "ghost" | "delta" | "xray"
 *   visible         boolean
 */

import React, { useRef, useEffect, useMemo } from "react";
import { useFrame }                           from "@react-three/fiber";
import { useShallow }                         from "zustand/react/shallow";
import * as THREE                             from "three";

import { useModelLoader }                  from "./useModelLoader";
import { useMorphInterpolator }            from "./MorphInterpolator";
import PostureRig                          from "./PostureRig";
import use3DStore                          from "../../store/use3DStore";

// ─────────────────────────────────────────────────────────────────────────────
// SKIN MATERIAL FACTORY
// Creates the base skin material. Custom SSS shader replaces this in Layer 4.
// This placeholder gives correct Fitzpatrick-scale skin tones using PBR.
// ─────────────────────────────────────────────────────────────────────────────

const FITZPATRICK_COLORS = {
  I:   new THREE.Color(0xfff0e0),   // very fair
  II:  new THREE.Color(0xf5d5b0),   // fair
  III: new THREE.Color(0xe8b88a),   // medium
  IV:  new THREE.Color(0xc68642),   // olive/brown (Gokul's tone)
  V:   new THREE.Color(0x8d5524),   // brown
  VI:  new THREE.Color(0x4a2912),   // deep
};

function createSkinMaterial(skinTone = "IV") {
  const color = FITZPATRICK_COLORS[skinTone] ?? FITZPATRICK_COLORS.IV;

  return new THREE.MeshStandardMaterial({
    color,
    roughness:    0.72,
    metalness:    0.0,
    // SSS placeholder — Layer 4 replaces this with custom GLSL
    // emissive: warm back-light bleed placeholder
    emissive:     new THREE.Color(0x3d1a08),
    emissiveIntensity: 0.04,
    side:         THREE.FrontSide,
    transparent:  false,
    depthWrite:   true,
  });
}

function createGhostMaterial(skinTone = "IV") {
  return new THREE.MeshStandardMaterial({
    color:       new THREE.Color("#22D3EE"),
    emissive:    new THREE.Color("#22D3EE"),
    emissiveIntensity: 0.3,
    roughness:   0.2,
    metalness:   0.1,
    transparent: true,
    opacity:     0.3,
    depthWrite:  false,
    side:        THREE.DoubleSide,
  });
}

function createDeltaMaterial() {
  // Delta mode uses a custom shader in Layer 4.
  // Placeholder: wireframe to suggest "analysis mode"
  return new THREE.MeshStandardMaterial({
    color:       0x888888,
    roughness:   1.0,
    metalness:   0.0,
    wireframe:   false,
    transparent: false,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AURA MESH — goal clone outer glow ring (rendered as a slightly inflated clone)
// Full volumetric god-ray aura is Layer 4 shader territory.
// This provides the rim glow on the goal clone.
// ─────────────────────────────────────────────────────────────────────────────

function AuraMesh({ bodyMesh, visible }) {
  const auraMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color:       new THREE.Color("#22D3EE"),
        side:        THREE.BackSide, // renders on the inside of the inflated mesh
        transparent: true,
        opacity:     0.18,
        depthWrite:  false,
      }),
    []
  );

  if (!bodyMesh || !visible) return null;

  return (
    <mesh
      geometry={bodyMesh.geometry}
      material={auraMaterial}
      morphTargetDictionary={bodyMesh.morphTargetDictionary}
      morphTargetInfluences={bodyMesh.morphTargetInfluences}
      scale={1.018} // slightly inflated for rim
      castShadow={false}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HUMANOID CLONE
// ─────────────────────────────────────────────────────────────────────────────

export default function HumanoidClone({
  cloneKey    = "A",
  position    = [0, 0, 0],
  opacity     = 1,
  snapWeights = false,
  renderMode  = "normal",   // "normal" | "ghost" | "delta" | "xray"
  visible     = true,
  showAura    = false,
}) {
  const groupRef  = useRef();
  const meshRef   = useRef();

  // ── Load model ─────────────────────────────────────────────────────────────
  const { bodyMesh, morphIndexMap, skeleton, scene } = useModelLoader();

  // ── Store slice ────────────────────────────────────────────────────────────
  const { weights, metrics, posture } = use3DStore(
    useShallow((s) => {
      const clone = cloneKey === "B" ? s.cloneB : s.cloneA;
      return {
        weights: clone.weights,
        metrics: clone.metrics,
        posture: clone.posture,
      };
    })
  );

  // ── Morph interpolator ─────────────────────────────────────────────────────
  const { interpolator, updateWeights } = useMorphInterpolator(snapWeights);

  // Sync weights from store into interpolator whenever they change
  useEffect(() => {
    updateWeights(weights);
  }, [weights, updateWeights]);

  // ── Material management ────────────────────────────────────────────────────
  const material = useMemo(() => {
    switch (renderMode) {
      case "ghost": return createGhostMaterial(metrics.skinTone);
      case "delta": return createDeltaMaterial();
      default:      return createSkinMaterial(metrics.skinTone);
    }
  }, [renderMode, metrics.skinTone]);

  // Update material opacity (GHOST mode driven by parent)
  useEffect(() => {
    if (!material) return;
    if (material.transparent) {
      material.opacity = opacity;
    }
  }, [material, opacity]);

  // ── Attach cloned mesh to ref ──────────────────────────────────────────────
  useEffect(() => {
    if (meshRef.current && bodyMesh) {
      meshRef.current.morphTargetDictionary  = bodyMesh.morphTargetDictionary;
      meshRef.current.morphTargetInfluences  = [...(bodyMesh.morphTargetInfluences ?? [])];
    }
  }, [bodyMesh]);

  // ── Per-frame: advance interpolator and apply to mesh ─────────────────────
  useFrame((_, delta) => {
    if (!meshRef.current || !bodyMesh) return;

    interpolator.tick(delta);
    interpolator.applyToMesh(meshRef.current, morphIndexMap);

    // Pass shader-only uniforms to material (Layer 4 will read these)
    if (meshRef.current.material?.userData) {
      meshRef.current.material.userData.fitzpatrickIndex =
        interpolator.getWeight("fitzpatrick_index");
      meshRef.current.material.userData.vascularityIntensity =
        interpolator.getWeight("vascularity_intensity");
    }
  });

  if (!bodyMesh || !visible) return null;

  return (
    <group
      ref={groupRef}
      position={position}
      name={`clone-${cloneKey}`}
    >
      {/* ── Primary body mesh ── */}
      {skeleton ? (
        <skinnedMesh
          ref={meshRef}
          geometry={bodyMesh.geometry}
          material={material}
          skeleton={skeleton}
          castShadow={renderMode === "normal"}
          receiveShadow={false}
        />
      ) : (
        <mesh
          ref={meshRef}
          geometry={bodyMesh.geometry}
          material={material}
          castShadow={renderMode === "normal"}
          receiveShadow={false}
        />
      )}

      {/* ── Aura rim (goal clone only) ── */}
      <AuraMesh bodyMesh={bodyMesh} visible={showAura} />

      {/* ── Posture rig (bone rotations) ── */}
      <PostureRig skeleton={skeleton} posture={posture} />
    </group>
  );
}
