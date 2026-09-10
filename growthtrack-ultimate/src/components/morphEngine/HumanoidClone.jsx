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
 *   metricsOverride  object|null      — optional read-only render snapshot
 *   weightsOverride  object|null      — optional precomputed snapshot weights
 */

import React, { useRef, useEffect, useMemo } from "react";
import { createPortal, useFrame }             from "@react-three/fiber";
import { useShallow }                         from "zustand/react/shallow";
import * as THREE                             from "three";

import { useModelLoader }       from "./useModelLoader";
import { useMorphInterpolator } from "./MorphInterpolator";
import PostureRig               from "./PostureRig";
import use3DStore               from "../../store/use3DStore";
import { createSkinMaterial, updateSkinUniforms, createRimAuraMaterial, updateAuraUniforms } from "./UberShader";
import { createClothMaterial, isClothPreset } from "./WardrobeShader";
import { createDeltaMaterial as createDeltaHeatmapMaterial, updateDeltaUniforms } from "./DeltaHeatmapShader";
import { resolveBodyMetrics } from "../../lib/bodyMetricFallbacks";
import { computeHeightScale, resolveSkinTone } from "./metricsToBlendshapes";

const ProceduralHumanoid = React.lazy(() => import("./ProceduralHumanoid"));

// ─────────────────────────────────────────────────────────────────────────────
// MATERIAL FACTORY
// ─────────────────────────────────────────────────────────────────────────────

// We'll use createSkinMaterial from UberShader directly.

function createGhostMaterial(opacity = 0.24) {
  return new THREE.MeshStandardMaterial({
    color:             new THREE.Color("#67E8F9"),
    emissive:          new THREE.Color("#0EA5E9"),
    emissiveIntensity: 0.26,
    roughness:         0.28,
    metalness:         0.05,
    transparent:       true,
    opacity,
    depthWrite:        false,
    polygonOffset:     true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    side:              THREE.DoubleSide,
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
  metricsOverride = null,
  weightsOverride = null,
  deltaMetrics = null,
}) {
  const groupRef = useRef();
  const auraRef = useRef();
  const clothOverlayRef = useRef();
  const mouthRef = useRef();
  const scalpRef = useRef();

  const modelPreference = use3DStore(useShallow((s) => {
    const metrics = cloneKey === "B" ? s.cloneB.metrics : s.cloneA.metrics;
    const current = s.cloneA.metrics;
    return {
      biologicalSex: metrics.biologicalSex || current.biologicalSex,
      modelPreset: metrics.modelPreset || current.modelPreset,
      avatarAsset: metrics.avatarAsset || current.avatarAsset,
    };
  }));

  // ── Load model ──────────────────────────────────────────────────────────────
  const { bodyMesh, morphIndexMap, morphMeshes, privateAnatomyMesh, featureMeshes, skinVariantMaterials, skeleton, scene, diagnostics } = useModelLoader(modelPreference);
  const useProcedural = !bodyMesh || diagnostics?.isSuspicious;
  const setModelFrame = use3DStore((s) => s.setModelFrame);
  const setModelDiagnostics = use3DStore((s) => s.setModelDiagnostics);
  const gpuTier = use3DStore((s) => s.gpuTier);
  const privateAnatomyVisible = use3DStore((s) => s.privateAnatomyVisible);
  const wardrobe = use3DStore((s) => s.wardrobeState);

  // ── Store slice ─────────────────────────────────────────────────────────────
  const { weights, metrics, posture, inheritedMetrics } = use3DStore(
    useShallow((s) => {
      const clone = cloneKey === "B" ? s.cloneB : s.cloneA;
      return {
        weights: weightsOverride || clone.weights,
        metrics: metricsOverride || clone.metrics,
        posture: clone.posture,
        inheritedMetrics: cloneKey === "B" ? s.cloneA.metrics : null,
      };
    })
  );
  const renderMetrics = useMemo(() => resolveBodyMetrics(
    metrics,
    inheritedMetrics || {},
  ).metrics, [inheritedMetrics, metrics]);
  const heightScale = useMemo(
    () => computeHeightScale(renderMetrics),
    [renderMetrics],
  );
  const skinTone = useMemo(() => resolveSkinTone(renderMetrics), [renderMetrics]);

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
      center: center.clone().setY(center.y * heightScale),
      size: size.clone().setY(size.y * heightScale),
      height: Math.max(size.y * heightScale, 0.001),
      radius: Math.max(size.x, size.y * heightScale, size.z) * 0.5,
    });
  }, [bodyMesh, heightScale, scene, setModelFrame, useProcedural]);

  useEffect(() => {
    setModelDiagnostics(diagnostics ? {
      ...diagnostics,
      activeRenderer: useProcedural ? 'procedural-production' : 'authored-glb',
    } : null);
  }, [diagnostics, setModelDiagnostics, useProcedural]);

  // ── Material ────────────────────────────────────────────────────────────────
  const material = useMemo(() => {
    switch (renderMode) {
      case "ghost": return createGhostMaterial(opacity);
      case "delta": return createDeltaHeatmapMaterial();
      default: {
        const toneIndex = { "I":0, "II":1, "III":2, "IV":3, "V":4, "VI":5 }[skinTone] ?? 3;
        const variant = toneIndex <= 1
          ? skinVariantMaterials?.SkinVariant_Light
          : toneIndex >= 4
            ? skinVariantMaterials?.SkinVariant_Deep
            : null;
        return createSkinMaterial(toneIndex, variant || bodyMesh?.material || null, {
          bodyHairIntensity: renderMetrics?.bodyHairDensity ?? 0.18,
          skinColorHex: renderMetrics?.skinColor ?? renderMetrics?.skinColorHex,
          vertexColors: true,
        });
      }
    }
  }, [bodyMesh, opacity, renderMetrics, renderMode, skinTone, skinVariantMaterials]);

  // The protected anatomy surface uses the same tone but no body atlas. The
  // atlas is laid out for the MakeHuman body UV islands and would otherwise
  // paint unrelated chest/face pixels across the private mesh.
  const privateMaterial = useMemo(() => {
    if (renderMode !== "normal") return material;
    const toneIndex = { "I":0, "II":1, "III":2, "IV":3, "V":4, "VI":5 }[skinTone] ?? 3;
    return createSkinMaterial(toneIndex, null, { skinColorHex: renderMetrics?.skinColor ?? renderMetrics?.skinColorHex });
  }, [material, renderMetrics, renderMode, skinTone]);

  // The authored GLB carries real MakeHuman eye and hair-card textures. Clone
  // their materials per figure so the two comparison models can customize
  // colour independently without mutating the shared GLTF cache.
  const featureMaterials = useMemo(() => {
    const eyeColor = renderMetrics?.eyeColor || '#6b3b20';
    const hairColor = renderMetrics?.hairColor || '#21140f';
    const materials = {};
    (featureMeshes || []).forEach(({ mesh, feature }) => {
      const source = Array.isArray(mesh?.material) ? mesh.material[0] : mesh?.material;
      if (feature === 'eyes') {
        materials.eyes = new THREE.MeshPhysicalMaterial({
          map: source?.map || null,
          normalMap: source?.normalMap || null,
          normalScale: source?.normalScale?.clone?.() || new THREE.Vector2(0.08, 0.08),
          color: '#ffffff',
          roughness: 0.16,
          clearcoat: 0.78,
          clearcoatRoughness: 0.06,
          transparent: false,
          alphaTest: 0.12,
          side: THREE.DoubleSide,
        });
        // Keep the sclera white and pupil dark; tint only the coloured iris.
        materials.eyes.onBeforeCompile = (shader) => {
          shader.uniforms.uIrisColor = { value: new THREE.Color(eyeColor) };
          shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uIrisColor;')
            .replace('#include <map_fragment>', `#include <map_fragment>
              float irisMax = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
              float irisMin = min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b));
              float irisMask = smoothstep(0.025, 0.15, irisMax - irisMin) * smoothstep(0.015, 0.08, irisMax);
              diffuseColor.rgb = mix(diffuseColor.rgb, uIrisColor * (0.4 + irisMax), irisMask * 0.65);`);
        };
        materials.eyes.customProgramCacheKey = () => `iris-${eyeColor}`;
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
  }, [featureMeshes, renderMetrics]);

  const headBone = useMemo(
    () => skeleton?.bones?.find((bone) => bone.name === 'Head') || null,
    [skeleton],
  );

  const hairStyle = renderMetrics?.hairStyle || 'short';
  const hairColor = renderMetrics?.hairColor || '#21140f';
  const scalpMaterial = useMemo(() => {
    const scalp = new THREE.MeshPhysicalMaterial({
      color: hairColor,
      roughness: 0.62,
      metalness: 0,
      clearcoat: 0.14,
      clearcoatRoughness: 0.42,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const frontHairline = hairStyle === 'buzz' ? 0.860 : 0.854;
    const backHairline = hairStyle === 'buzz' ? 0.824 : 0.812;
    scalp.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vGrowthTrackHairPosition;')
        .replace('#include <project_vertex>', 'vGrowthTrackHairPosition = transformed;\n#include <project_vertex>');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vGrowthTrackHairPosition;')
        .replace('#include <alphatest_fragment>', `
          float hairFront = smoothstep(-0.025, 0.13, vGrowthTrackHairPosition.z);
          float hairline = mix(${backHairline.toFixed(3)}, ${frontHairline.toFixed(3)}, hairFront);
          float centrePeak = 1.0 - smoothstep(0.0, 0.038, abs(vGrowthTrackHairPosition.x));
          float templeLift = smoothstep(0.035, 0.072, abs(vGrowthTrackHairPosition.x));
          hairline += templeLift * hairFront * 0.004;
          hairline -= centrePeak * hairFront * 0.006;
          if (vGrowthTrackHairPosition.y < hairline) discard;
          #include <alphatest_fragment>
        `);
    };
    scalp.customProgramCacheKey = () => `growthtrack-scalp-${hairStyle}`;
    return scalp;
  }, [hairColor, hairStyle]);

  useEffect(() => () => scalpMaterial.dispose(), [scalpMaterial]);

  useEffect(() => {
    if (useProcedural || !bodyMesh || !skeleton || hairStyle === 'bald' || renderMode !== 'normal') return undefined;
    const parent = bodyMesh.parent || scene;
    const scalp = new THREE.SkinnedMesh(bodyMesh.geometry, scalpMaterial);
    scalp.name = 'GrowthTrackScalpCap';
    scalp.position.copy(bodyMesh.position);
    scalp.quaternion.copy(bodyMesh.quaternion);
    scalp.scale.copy(bodyMesh.scale);
    scalp.morphTargetDictionary = bodyMesh.morphTargetDictionary;
    scalp.morphTargetInfluences = new Float32Array(bodyMesh.morphTargetInfluences?.length || 0);
    scalp.bind(skeleton, bodyMesh.bindMatrix);
    scalp.renderOrder = 2;
    scalp.castShadow = false;
    scalp.receiveShadow = false;
    scalp.frustumCulled = false;
    parent.add(scalp);
    scalpRef.current = scalp;
    return () => {
      parent.remove(scalp);
      if (scalpRef.current === scalp) scalpRef.current = null;
    };
  }, [bodyMesh, hairStyle, renderMode, scalpMaterial, scene, skeleton, useProcedural]);

  const clothMaterial = useMemo(() => (
    renderMode === "normal" && isClothPreset(wardrobe)
      ? createClothMaterial(wardrobe, bodyMesh?.geometry)
      : null
  ), [bodyMesh, renderMode, wardrobe]);

  // Aura materials are GPU resources. Creating one in JSX would allocate a
  // fresh material on every parent render and leak the old shader until the
  // WebGL context is reclaimed. Keep one material per aura lifecycle and
  // dispose it when the lifecycle ends.
  const auraMaterial = useMemo(
    () => (showAura && bodyMesh && skeleton ? createRimAuraMaterial() : null),
    [bodyMesh, showAura, skeleton],
  );

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
    auraMaterial?.dispose?.();
  }, [auraMaterial]);

  useEffect(() => () => {
    material?.dispose?.();
    if (privateMaterial !== material) privateMaterial?.dispose?.();
  }, [material, privateMaterial]);

  useEffect(() => {
    (featureMeshes || []).forEach(({ mesh, feature }) => {
      const next = renderMode === 'normal' ? featureMaterials[feature] : material;
      if (next) mesh.material = next;
      if (feature === 'hair') mesh.visible = ['medium', 'long'].includes(hairStyle);
      mesh.renderOrder = renderMode === 'ghost' ? 3 : 0;
      mesh.castShadow = renderMode === 'normal';
      mesh.receiveShadow = false;
    });
  }, [featureMeshes, featureMaterials, hairStyle, material, renderMode]);

  useEffect(() => () => {
    Object.values(featureMaterials).forEach((featureMaterial) => featureMaterial.dispose());
  }, [featureMaterials]);

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
    overlay.position.copy(bodyMesh.position);
    overlay.quaternion.copy(bodyMesh.quaternion);
    overlay.scale.copy(bodyMesh.scale);
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

  // An aura must share the body's parent, bind matrix and morphs. A sibling
  // outside the normalized scene produces detached glowing face/hand patches.
  useEffect(() => {
    if (useProcedural || !bodyMesh || !skeleton || !auraMaterial) return undefined;
    const parent = bodyMesh.parent || scene;
    const aura = new THREE.SkinnedMesh(bodyMesh.geometry, auraMaterial);
    aura.name = `GrowthTrackAura_${cloneKey}`;
    aura.position.copy(bodyMesh.position);
    aura.quaternion.copy(bodyMesh.quaternion);
    aura.scale.copy(bodyMesh.scale);
    aura.bind(skeleton, bodyMesh.bindMatrix);
    aura.morphTargetDictionary = bodyMesh.morphTargetDictionary;
    aura.morphTargetInfluences = new Float32Array(bodyMesh.morphTargetInfluences?.length || 0);
    aura.frustumCulled = false;
    aura.renderOrder = 2;
    parent.add(aura);
    auraRef.current = aura;
    return () => { parent.remove(aura); auraRef.current = null; };
  }, [auraMaterial, bodyMesh, cloneKey, scene, skeleton, useProcedural]);

  // Apply one coherent skin material to every authored surface, including the
  // separately gated private-anatomy mesh.
  useEffect(() => {
    if (bodyMesh && !useProcedural) {
      (morphMeshes || [{ mesh: bodyMesh }]).forEach(({ mesh, sensitive }) => {
        if (!mesh) return;
        mesh.material = sensitive ? privateMaterial : material;
        mesh.castShadow = renderMode === "normal";
        mesh.receiveShadow = false;
        mesh.renderOrder = renderMode === "ghost" ? 3 : 0;
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
    if (scalpRef.current) interpolator.applyToMesh(scalpRef.current, morphIndexMap);
    if (auraRef.current) interpolator.applyToMesh(auraRef.current, morphIndexMap);

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
        skinColorHex:         renderMetrics?.skinColor ?? renderMetrics?.skinColorHex,
        vascularityIntensity: interpolator.getWeight("vascularity_intensity"),
        bodyHairIntensity:    renderMetrics?.bodyHairDensity ?? 0.18,
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
    if (renderMode === "delta") {
      updateDeltaUniforms(material, { deltas: deltaMetrics || {}, time: _.clock.elapsedTime });
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
        skinTone={skinTone}
        skinColorHex={renderMetrics?.skinColor ?? renderMetrics?.skinColorHex}
        lipColorHex={renderMetrics?.lipColor}
        nailColorHex={renderMetrics?.nailColor}
        eyeColor={renderMetrics?.eyeColor ?? "#6b3b20"}
        hairColor={renderMetrics?.hairColor ?? "darkbrown"}
        expressionWeights={weights}
        heightScale={heightScale}
        quality={gpuTier === "LOW" ? "LOW" : gpuTier === "MED" ? "MED" : "HIGH"}
      />
    );
  }

  // ── GLB path ─────────────────────────────────────────────────────────────────
  return (
    <group ref={groupRef} position={position} scale={[1, heightScale, 1]} name={`clone-${cloneKey}`}>
      {scene && <primitive object={scene} />}

      {/* Teeth/tongue are currently procedural production geometry because the
          authored GLB has no mouth-detail nodes. Portalling them into Head keeps
          them correct under every posture instead of using a scene-space patch. */}
      {headBone && createPortal(
        <>
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
          </group>
        </>,
        headBone,
      )}

      {/* Posture bone rig */}
      <PostureRig skeleton={skeleton} posture={posture} />
    </group>
  );
}
