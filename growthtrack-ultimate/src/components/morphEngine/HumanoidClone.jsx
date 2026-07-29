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
import { createSkinMaterial, updateSkinUniforms, createRimAuraMaterial, updateAuraUniforms } from "./UberShader";

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL FACTORY
// ─────────────────────────────────────────────────────────────────────────────

// We'll use createSkinMaterial from UberShader directly.

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
  const auraRef = useRef();

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
      default: {
        const toneIndex = { "I":0, "II":1, "III":2, "IV":3, "V":4, "VI":5 }[metrics?.skinTone] ?? 3;
        return createSkinMaterial(toneIndex);
      }
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
    if (bodyMesh.material?.uniforms) {
      updateSkinUniforms(bodyMesh.material, {
        fitzpatrickIndex:     interpolator.getWeight("fitzpatrick_index"),
        vascularityIntensity: interpolator.getWeight("vascularity_intensity"),
        time: _.clock.elapsedTime
      });
    }
    
    // Aura uniform update
    if (showAura && auraRef.current) {
      updateAuraUniforms({ rimMat: auraRef.current.material }, {
        time: _.clock.elapsedTime,
        intensity: 1.0 // TODO: map this to ambition progress if needed
      });
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
      {showAura && bodyMesh && skeleton && (
        <skinnedMesh
          ref={auraRef}
          geometry={bodyMesh.geometry}
          material={createRimAuraMaterial()}
          skeleton={skeleton}
          morphTargetDictionary={bodyMesh.morphTargetDictionary}
          morphTargetInfluences={bodyMesh.morphTargetInfluences || []}
        />
      )}

      {/* Posture bone rig */}
      <PostureRig skeleton={skeleton} posture={posture} />
    </group>
  );
}
