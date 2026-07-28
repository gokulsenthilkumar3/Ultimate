/**
 * GrowthTrack Ultimate — Layer 3: Parametric Morph Engine
 * HumanoidClone.jsx
 *
 * A single rendered clone of the humanoid model.
 * Falls back to ProceduralHumanoid when no GLB is available.
 *
 * Props:
 *   cloneKey        "A" | "B"        — which store slice to read
 *   position        [x, y, z]        — world position (CloneEngine places it)
 *   opacity         0–1              — for GHOST mode
 *   snapWeights     boolean          — true = no lerp (goal clone)
 *   renderMode      "normal" | "ghost" | "delta" | "xray"
 *   visible         boolean
 *   showAura        boolean          — goal clone rim glow
 */

import React, { useRef, useEffect, useMemo } from "react";
import { useFrame }                           from "@react-three/fiber";
import { useShallow }                         from "zustand/react/shallow";
import * as THREE                             from "three";

import { useModelLoader }       from "./useModelLoader";
import { useMorphInterpolator } from "./MorphInterpolator";
import PostureRig               from "./PostureRig";
import ProceduralHumanoid       from "./ProceduralHumanoid";
import use3DStore               from "../../store/use3DStore";

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL FACTORY
// ─────────────────────────────────────────────────────────────────────────────

const FITZPATRICK_COLORS = {
  I:   new THREE.Color(0xfff0e0),
  II:  new THREE.Color(0xf5d5b0),
  III: new THREE.Color(0xe8b88a),
  IV:  new THREE.Color(0xc68642),
  V:   new THREE.Color(0x8d5524),
  VI:  new THREE.Color(0x4a2912),
};

function createSkinMaterial(skinTone = "IV") {
  const color = FITZPATRICK_COLORS[skinTone] ?? FITZPATRICK_COLORS.IV;
  return new THREE.MeshStandardMaterial({
    color,
    roughness:         0.72,
    metalness:         0.0,
    emissive:          color.clone().multiplyScalar(0.08),
    emissiveIntensity: 1.0,
    side:              THREE.FrontSide,
    depthWrite:        true,
  });
}

function createGhostMaterial() {
  return new THREE.MeshStandardMaterial({
    color:             new THREE.Color("#22D3EE"),
    emissive:          new THREE.Color("#22D3EE"),
    emissiveIntensity: 0.35,
    roughness:         0.15,
    metalness:         0.2,
    transparent:       true,
    opacity:           0.30,
    depthWrite:        false,
    side:              THREE.DoubleSide,
  });
}

function createDeltaMaterial() {
  return new THREE.MeshStandardMaterial({
    color:             new THREE.Color("#F59E0B"),
    emissive:          new THREE.Color("#7A4800"),
    emissiveIntensity: 0.12,
    roughness:         0.55,
    metalness:         0.1,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HUMANOID CLONE
// ─────────────────────────────────────────────────────────────────────────────

export default function HumanoidClone({
  cloneKey    = "A",
  position    = [0, 0, 0],
  opacity     = 1,
  snapWeights = false,
  renderMode  = "normal",
  visible     = true,
  showAura    = false,
}) {
  const groupRef = useRef();

  // ── Load model ──────────────────────────────────────────────────────────────
  const { bodyMesh, morphIndexMap, skeleton, scene, isDev } = useModelLoader();

  // ── Store slice ─────────────────────────────────────────────────────────────
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

  // ── Morph interpolator ──────────────────────────────────────────────────────
  const { interpolator, updateWeights } = useMorphInterpolator(snapWeights);

  useEffect(() => {
    updateWeights(weights);
  }, [weights, updateWeights]);

  // ── Material ────────────────────────────────────────────────────────────────
  const material = useMemo(() => {
    switch (renderMode) {
      case "ghost": return createGhostMaterial();
      case "delta": return createDeltaMaterial();
      default:      return createSkinMaterial(metrics?.skinTone ?? "IV");
    }
  }, [renderMode, metrics?.skinTone]);

  // Sync opacity into material
  useEffect(() => {
    if (!material) return;
    if (material.transparent) material.opacity = opacity;
  }, [material, opacity]);

  // Apply material to GLB mesh when available
  useEffect(() => {
    if (bodyMesh) {
      bodyMesh.material = material;
      bodyMesh.castShadow    = renderMode === "normal";
      bodyMesh.receiveShadow = false;
    }
  }, [bodyMesh, material, renderMode]);

  // ── Per-frame morph application ─────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!bodyMesh) return;
    interpolator.tick(delta);
    interpolator.applyToMesh(bodyMesh, morphIndexMap);

    // Shader uniforms for Layer 4 materials
    if (bodyMesh.material?.userData) {
      bodyMesh.material.userData.fitzpatrickIndex    = interpolator.getWeight("fitzpatrick_index");
      bodyMesh.material.userData.vascularityIntensity = interpolator.getWeight("vascularity_intensity");
    }
  });

  // ── Visibility guard ────────────────────────────────────────────────────────
  if (!visible) return null;

  // ── Dev fallback: no GLB → use procedural model ─────────────────────────────
  if (isDev || !bodyMesh) {
    return (
      <ProceduralHumanoid
        cloneKey={cloneKey}
        position={position}
        renderMode={renderMode}
        opacity={opacity}
        visible={visible}
        showAura={showAura}
        skinTone={metrics?.skinTone ?? "IV"}
      />
    );
  }

  // ── GLB path ─────────────────────────────────────────────────────────────────
  return (
    <group ref={groupRef} position={position} name={`clone-${cloneKey}`}>
      {scene && <primitive object={scene} />}

      {/* Aura rim — goal clone only */}
      {showAura && bodyMesh && (
        <mesh
          geometry={bodyMesh.geometry}
          material={new THREE.MeshBasicMaterial({
            color:       "#22D3EE",
            side:        THREE.BackSide,
            transparent: true,
            opacity:     0.16,
            depthWrite:  false,
          })}
          morphTargetDictionary={bodyMesh.morphTargetDictionary}
          morphTargetInfluences={bodyMesh.morphTargetInfluences || []}
          scale={1.018}
        />
      )}

      {/* Posture bone rig */}
      <PostureRig skeleton={skeleton} posture={posture} />
    </group>
  );
}
