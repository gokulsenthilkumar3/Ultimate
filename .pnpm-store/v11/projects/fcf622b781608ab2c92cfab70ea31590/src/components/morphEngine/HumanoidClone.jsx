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

function FeatureOverlay({ metrics }) {
  const eyeColor = metrics?.eyeColor || '#5a3018';
  const hairColor = metrics?.hairColor || '#21140f';
  const eyeMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#f6f2ea', roughness: 0.22, clearcoat: 0.65 }), []);
  const irisMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({ color: eyeColor, roughness: 0.16, clearcoat: 0.9, clearcoatRoughness: 0.08 }), [eyeColor]);
  const pupilMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#070606' }), []);
  const hairMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({ color: hairColor, roughness: 0.58, clearcoat: 0.18 }), [hairColor]);
  return (
    <group name="face-features" dispose={null}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.060, 1.835, 0.208]} scale={[1, 0.78, 0.55]}>
          <mesh material={eyeMaterial}><sphereGeometry args={[0.027, 24, 16]} /></mesh>
          <mesh position={[0, 0, 0.017]} material={irisMaterial} scale={[0.58, 0.84, 0.22]}><sphereGeometry args={[0.020, 20, 14]} /></mesh>
          <mesh position={[0, 0, 0.021]} material={pupilMaterial} scale={[0.48, 0.86, 0.18]}><sphereGeometry args={[0.011, 16, 10]} /></mesh>
        </group>
      ))}
      <mesh name="hair-cap" position={[0, 1.935, 0.012]} scale={[1.08, 0.92, 0.94]} rotation={[0.04, 0, 0]} material={hairMaterial}>
        <sphereGeometry args={[0.145, 32, 18, 0, Math.PI * 2, 0, Math.PI * 0.60]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={`brow-${side}`} position={[side * 0.060, 1.882, 0.227]} rotation={[0.1, side * 0.15, side * 0.12]} scale={[1.34, 0.20, 0.22]} material={hairMaterial}>
          <sphereGeometry args={[0.020, 14, 8]} />
        </mesh>
      ))}
    </group>
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
  renderMode  = "normal",
  visible     = true,
  showAura    = false,
}) {
  const groupRef = useRef();
  const auraRef = useRef();

  // ── Load model ──────────────────────────────────────────────────────────────
  const { bodyMesh, morphIndexMap, morphMeshes, privateAnatomyMesh, skeleton, scene, diagnostics } = useModelLoader();
  const useProcedural = !bodyMesh || diagnostics?.isSuspicious || Object.keys(morphIndexMap || {}).length < 12;
  const setModelFrame = use3DStore((s) => s.setModelFrame);
  const setModelDiagnostics = use3DStore((s) => s.setModelDiagnostics);
  const gpuTier = use3DStore((s) => s.gpuTier);
  const privateAnatomyVisible = use3DStore((s) => s.privateAnatomyVisible);

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

  useEffect(() => {
    if (!scene || useProcedural) return;
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    
    // Auto-normalize scale and position for arbitrary GLBs
    setModelFrame({
      center,
      size,
      height: Math.max(size.y, 0.001),
      radius: Math.max(size.x, size.y, size.z) * 0.5,
    });
  }, [scene, setModelFrame, useProcedural]);

  useEffect(() => {
    setModelDiagnostics(diagnostics ? {
      ...diagnostics,
      activeRenderer: useProcedural ? 'procedural-production' : 'authored-glb',
    } : null);
  }, [diagnostics, setModelDiagnostics, useProcedural]);

  // ── Material ────────────────────────────────────────────────────────────────
  const material = useMemo(() => {
    switch (renderMode) {
      case "ghost": return createGhostMaterial();
      case "delta": return createDeltaMaterial();
      default: {
        const toneIndex = { "I":0, "II":1, "III":2, "IV":3, "V":4, "VI":5 }[metrics?.skinTone] ?? 3;
        return createSkinMaterial(toneIndex, bodyMesh?.material?.map || null);
      }
    }
  }, [bodyMesh, renderMode, metrics?.skinTone]);

  // The protected anatomy surface uses the same tone but no body atlas. The
  // atlas is laid out for the MakeHuman body UV islands and would otherwise
  // paint unrelated chest/face pixels across the private mesh.
  const privateMaterial = useMemo(() => {
    if (renderMode !== "normal") return material;
    const toneIndex = { "I":0, "II":1, "III":2, "IV":3, "V":4, "VI":5 }[metrics?.skinTone] ?? 3;
    return createSkinMaterial(toneIndex, null);
  }, [material, metrics?.skinTone, renderMode]);

  // Apply one coherent skin material to every authored surface, including the
  // separately gated private-anatomy mesh.
  useEffect(() => {
    if (bodyMesh && !useProcedural) {
      (morphMeshes || [{ mesh: bodyMesh }]).forEach(({ mesh, sensitive }) => {
        if (!mesh) return;
        // eslint-disable-next-line react-hooks/immutability
        mesh.material = sensitive ? privateMaterial : material;
        mesh.castShadow = renderMode === "normal";
        mesh.receiveShadow = false;
      });
      // eslint-disable-next-line react-hooks/immutability
      bodyMesh.material = material;
    }
    if (privateAnatomyMesh) privateAnatomyMesh.material = privateMaterial;
  }, [bodyMesh, material, morphMeshes, privateAnatomyMesh, privateMaterial, renderMode, useProcedural]);

  useEffect(() => {
    if (!privateAnatomyMesh) return;
    // The asset loads hidden and remains hidden in ghost/delta views. Only the
    // explicit per-session reveal in the anatomy editor can make it visible.
    // eslint-disable-next-line react-hooks/immutability
    privateAnatomyMesh.visible = privateAnatomyVisible && renderMode === "normal";
  }, [privateAnatomyMesh, privateAnatomyVisible, renderMode]);

  // ── Per-frame morph application ─────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!bodyMesh || useProcedural) return;
    interpolator.tick(delta);
    const targets = morphMeshes?.length
      ? morphMeshes
      : [{ mesh: bodyMesh, morphIndexMap }];
    targets.forEach(({ mesh, morphIndexMap: indexMap }) => {
      interpolator.applyToMesh(mesh, indexMap);
    });

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

  // ── Fallback: no body mesh → use procedural model ───────────────────────────
  if (useProcedural) {
    return (
      <ProceduralHumanoid
        cloneKey={cloneKey}
        position={position}
        renderMode={renderMode}
        opacity={opacity}
        visible={visible}
        showAura={showAura}
        skinTone={metrics?.skinTone ?? "IV"}
        quality={gpuTier === "LOW" ? "LOW" : gpuTier === "MED" ? "MED" : "HIGH"}
      />
    );
  }

  // ── GLB path ─────────────────────────────────────────────────────────────────
  return (
    <group ref={groupRef} position={position} name={`clone-${cloneKey}`}>
      {scene && <primitive object={scene} />}
      <FeatureOverlay metrics={metrics} />

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
