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
import { createPortal, useFrame }             from "@react-three/fiber";
import { useShallow }                         from "zustand/react/shallow";
import * as THREE                             from "three";

import { useModelLoader }       from "./useModelLoader";
import { useMorphInterpolator } from "./MorphInterpolator";
import PostureRig               from "./PostureRig";
import ProceduralHumanoid       from "./ProceduralHumanoid";
import use3DStore               from "../../store/use3DStore";
import { createSkinMaterial, updateSkinUniforms, createRimAuraMaterial, updateAuraUniforms } from "./UberShader";
import { createClothMaterial, isClothPreset } from "./WardrobeShader";

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
  const clothOverlayRef = useRef();
  const mouthRef = useRef();

  // ── Load model ──────────────────────────────────────────────────────────────
  const { bodyMesh, morphIndexMap, morphMeshes, privateAnatomyMesh, featureMeshes, skinVariantMaterials, skeleton, scene, diagnostics } = useModelLoader();
  const useProcedural = !bodyMesh || diagnostics?.isSuspicious || Object.keys(morphIndexMap || {}).length < 12;
  const setModelFrame = use3DStore((s) => s.setModelFrame);
  const setModelDiagnostics = use3DStore((s) => s.setModelDiagnostics);
  const gpuTier = use3DStore((s) => s.gpuTier);
  const privateAnatomyVisible = use3DStore((s) => s.privateAnatomyVisible);
  const wardrobe = use3DStore((s) => s.wardrobeState);

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
    const box = new THREE.Box3().setFromObject(bodyMesh);
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
  }, [bodyMesh, scene, setModelFrame, useProcedural]);

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
        const variant = toneIndex <= 1
          ? skinVariantMaterials?.SkinVariant_Light
          : toneIndex >= 4
            ? skinVariantMaterials?.SkinVariant_Deep
            : null;
        return createSkinMaterial(toneIndex, variant || bodyMesh?.material || null, {
          bodyHairIntensity: metrics?.bodyHairDensity ?? 0.18,
          vertexColors: true,
        });
      }
    }
  }, [bodyMesh, renderMode, metrics?.bodyHairDensity, metrics?.skinTone, skinVariantMaterials]);

  // The protected anatomy surface uses the same tone but no body atlas. The
  // atlas is laid out for the MakeHuman body UV islands and would otherwise
  // paint unrelated chest/face pixels across the private mesh.
  const privateMaterial = useMemo(() => {
    if (renderMode !== "normal") return material;
    const toneIndex = { "I":0, "II":1, "III":2, "IV":3, "V":4, "VI":5 }[metrics?.skinTone] ?? 3;
    return createSkinMaterial(toneIndex, null);
  }, [material, metrics?.skinTone, renderMode]);

  // The authored GLB carries real MakeHuman eye and hair-card textures. Clone
  // their materials per figure so the two comparison models can customize
  // colour independently without mutating the shared GLTF cache.
  const featureMaterials = useMemo(() => {
    const eyeColor = metrics?.eyeColor || '#6b3b20';
    const hairColor = metrics?.hairColor || '#21140f';
    const materials = {};
    (featureMeshes || []).forEach(({ mesh, feature }) => {
      const source = Array.isArray(mesh?.material) ? mesh.material[0] : mesh?.material;
      if (feature === 'eyes') {
        materials.eyes = new THREE.MeshPhysicalMaterial({
          map: source?.map || null,
          normalMap: source?.normalMap || null,
          normalScale: source?.normalScale?.clone?.() || new THREE.Vector2(0.08, 0.08),
          color: eyeColor,
          roughness: 0.16,
          clearcoat: 0.78,
          clearcoatRoughness: 0.06,
          transparent: true,
          alphaTest: 0.12,
          side: THREE.DoubleSide,
        });
      }
      if (feature === 'hair') {
        materials.hair = new THREE.MeshPhysicalMaterial({
          map: source?.map || null,
          normalMap: source?.normalMap || null,
          color: hairColor,
          roughness: 0.46,
          clearcoat: 0.24,
          clearcoatRoughness: 0.16,
          transparent: true,
          alphaTest: 0.34,
          side: THREE.DoubleSide,
        });
      }
    });
    return materials;
  }, [featureMeshes, metrics?.eyeColor, metrics?.hairColor]);

  const headBone = useMemo(
    () => skeleton?.bones?.find((bone) => bone.name === 'Head') || null,
    [skeleton],
  );

  const clothMaterial = useMemo(() => (
    renderMode === "normal" && isClothPreset(wardrobe)
      ? createClothMaterial(wardrobe)
      : null
  ), [renderMode, wardrobe]);

  const mouthMaterials = useMemo(() => ({
    interior: new THREE.MeshStandardMaterial({ color: "#190b0d", roughness: 0.72 }),
    teeth: new THREE.MeshPhysicalMaterial({ color: "#fff8e8", roughness: 0.24, clearcoat: 0.32 }),
    tongue: new THREE.MeshPhysicalMaterial({ color: "#a34f5f", roughness: 0.42, clearcoat: 0.08 }),
  }), []);

  useEffect(() => () => {
    Object.values(mouthMaterials).forEach((mouthMaterial) => mouthMaterial.dispose());
  }, [mouthMaterials]);

  useEffect(() => () => {
    clothMaterial?.dispose?.();
  }, [clothMaterial]);

  useEffect(() => () => {
    material?.dispose?.();
    if (privateMaterial !== material) privateMaterial?.dispose?.();
  }, [material, privateMaterial]);

  useEffect(() => {
    (featureMeshes || []).forEach(({ mesh, feature }) => {
      const next = featureMaterials[feature];
      if (next) mesh.material = next;
      if (feature === 'hair') mesh.visible = (metrics?.hairStyle || 'short') !== 'bald';
      mesh.castShadow = true;
      mesh.receiveShadow = false;
    });
    return () => Object.values(featureMaterials).forEach((featureMaterial) => featureMaterial.dispose());
  }, [featureMeshes, featureMaterials, metrics?.hairStyle]);

  // WardrobeShader is intentionally a surface overlay: it reuses the authored
  // body's exact geometry, skinning and morph targets, so clothing cannot drift
  // after a measurement change or a future body-asset refresh.
  useEffect(() => {
    if (useProcedural || !bodyMesh || !scene || !skeleton || !clothMaterial) return undefined;
    const parent = bodyMesh.parent || scene;
    const overlay = new THREE.SkinnedMesh(bodyMesh.geometry, clothMaterial);
    overlay.name = `GrowthTrackCloth_${cloneKey}`;
    overlay.morphTargetDictionary = bodyMesh.morphTargetDictionary;
    overlay.morphTargetInfluences = new Float32Array(bodyMesh.morphTargetInfluences?.length || 0);
    overlay.bind(skeleton, bodyMesh.bindMatrix);
    overlay.scale.setScalar(1.004);
    overlay.renderOrder = 1;
    overlay.frustumCulled = false;
    overlay.castShadow = true;
    overlay.receiveShadow = true;
    parent.add(overlay);
    clothOverlayRef.current = overlay;

    return () => {
      parent.remove(overlay);
      if (clothOverlayRef.current === overlay) clothOverlayRef.current = null;
    };
  }, [bodyMesh, cloneKey, clothMaterial, scene, skeleton, useProcedural]);

  // Apply one coherent skin material to every authored surface, including the
  // separately gated private-anatomy mesh.
  useEffect(() => {
    if (bodyMesh && !useProcedural) {
      (morphMeshes || [{ mesh: bodyMesh }]).forEach(({ mesh, sensitive }) => {
        if (!mesh) return;
        mesh.material = sensitive ? privateMaterial : material;
        mesh.castShadow = renderMode === "normal";
        mesh.receiveShadow = false;
      });
      // eslint-disable-next-line react-hooks/immutability
      bodyMesh.material = material;
    }
    if (privateAnatomyMesh) {
      // eslint-disable-next-line react-hooks/immutability
      privateAnatomyMesh.material = privateMaterial;
    }
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
    if (clothOverlayRef.current) {
      interpolator.applyToMesh(clothOverlayRef.current, morphIndexMap);
    }

    const blink = interpolator.getWeight("blink");
    const smile = interpolator.getWeight("smile");
    const jawOpen = interpolator.getWeight("jaw_open");
    (featureMeshes || []).forEach(({ mesh, feature }) => {
      if (feature === "eyes") mesh.visible = blink < 0.78;
    });
    if (mouthRef.current) {
      mouthRef.current.visible = jawOpen > 0.035 || smile > 0.58;
      mouthRef.current.scale.set(
        0.82 + smile * 0.30,
        0.70 + jawOpen * 1.55,
        0.82 + jawOpen * 0.20,
      );
    }

    // Shader uniforms for Layer 4 materials
    if (bodyMesh.material?.uniforms) {
      updateSkinUniforms(bodyMesh.material, {
        fitzpatrickIndex:     interpolator.getWeight("fitzpatrick_index"),
        vascularityIntensity: interpolator.getWeight("vascularity_intensity"),
        bodyHairIntensity:    metrics?.bodyHairDensity ?? 0.18,
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
        eyeColor={metrics?.eyeColor ?? "#6b3b20"}
        hairColor={metrics?.hairColor ?? "darkbrown"}
        expressionWeights={weights}
        quality={gpuTier === "LOW" ? "LOW" : gpuTier === "MED" ? "MED" : "HIGH"}
      />
    );
  }

  // ── GLB path ─────────────────────────────────────────────────────────────────
  return (
    <group ref={groupRef} position={position} name={`clone-${cloneKey}`}>
      {scene && <primitive object={scene} />}

      {/* Teeth/tongue are currently procedural production geometry because the
          authored GLB has no mouth-detail nodes. Portalling them into Head keeps
          them correct under every posture instead of using a scene-space patch. */}
      {headBone && createPortal(
        <group ref={mouthRef} position={[0, -0.02, 0.302]} visible={false} name="GrowthTrackMouthDetails">
          <mesh material={mouthMaterials.interior} scale={[1.15, 0.68, 0.34]} name="GrowthTrackMouthInterior">
            <sphereGeometry args={[0.036, 24, 14]} />
          </mesh>
          <mesh position={[0, 0.010, 0.014]} material={mouthMaterials.teeth} scale={[1.0, 0.50, 0.22]} name="GrowthTrackTeeth">
            <boxGeometry args={[0.076, 0.022, 0.008, 4, 2, 1]} />
          </mesh>
          <mesh position={[0, -0.012, 0.018]} material={mouthMaterials.tongue} scale={[1.0, 0.64, 0.30]} name="GrowthTrackTongue">
            <sphereGeometry args={[0.024, 24, 14]} />
          </mesh>
        </group>,
        headBone,
      )}

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
