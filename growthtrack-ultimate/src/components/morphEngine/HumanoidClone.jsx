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
import { inspectDigitalHumanV2 } from './digitalHumanV2';
import { createSoleGrounder } from './grounding';
import { isAnatomyVisible } from './anatomyVisibility';
import { useAnatomyEligibility } from './useAnatomyEligibility';
import { registerAvatarSource } from './avatarExport';
import { STRAND_FEATURES, createHairCardMaterial, createStrandMaterial, scalpHairline } from './featureMaterials';
import { applyAnatomySurface } from './anatomySurface';
import { createMorphNormalUpdater } from './deformedGeometryNormals';
import { createRegionFrameSampler } from './regionFrames';
import { ANATOMY_CALIBRATION_VERSION } from './anatomyCalibration';
import { createPrivateAnatomyDeformer, createButtockDeformer, ANATOMY_PREVIEW_VERSION } from './anatomyDeformation';
import { createAnatomyGuides } from './anatomyGuides';
import { createGarmentGeometry } from './garmentGeometry';

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
      modelVersion: metrics.modelVersion || current.modelVersion,
    };
  }));

  // ── Load model ──────────────────────────────────────────────────────────────
  const { bodyMesh, morphIndexMap, morphMeshes, privateAnatomyMesh, featureMeshes, skeleton, scene, diagnostics } = useModelLoader(modelPreference);
  const useProcedural = !bodyMesh || diagnostics?.isSuspicious;
  const anatomyAllowed = useAnatomyEligibility(diagnostics).allowed;
  const updateAnatomyNormals = useMemo(() => createMorphNormalUpdater(privateAnatomyMesh), [privateAnatomyMesh]);
  useEffect(() => () => {
    updateAnatomyNormals?.dispose();
    privateAnatomyMesh?.geometry.dispose();
  }, [updateAnatomyNormals, privateAnatomyMesh]);
  const groundSoles = useMemo(() => bodyMesh && scene ? createSoleGrounder(bodyMesh, scene) : null, [bodyMesh, scene]);
  const groundElapsed = useRef(1);
  const setModelFrame = use3DStore((s) => s.setModelFrame);
  const setModelDiagnostics = use3DStore((s) => s.setModelDiagnostics);
  const gpuTier = use3DStore((s) => s.gpuTier);
  const captureRedacted = use3DStore((s) => s.captureRedacted);
  const wardrobe = use3DStore((s) => s.wardrobeState);
  const wardrobeOptions=use3DStore(s=>s.wardrobePreferences.outfits[s.wardrobeState] || null);
  const anatomyProfile = use3DStore(s => s.anatomyCustomization[cloneKey === 'B' ? 'goal' : 'current']);
  const anatomyPreview = use3DStore(s => s.anatomyPreview);
  const privateDeformer=useMemo(()=>createPrivateAnatomyDeformer(privateAnatomyMesh,bodyMesh),[privateAnatomyMesh,bodyMesh]);
  const buttockDeformer=useMemo(()=>createButtockDeformer(bodyMesh,privateDeformer?.junction),[bodyMesh,privateDeformer]);
  const anatomyEvidenceRef=useRef(null);
  const anatomyGuidesRef=useRef(null);
  const guideSignatureRef=useRef(null);

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
  const sampleRegions = useMemo(() => createRegionFrameSampler(bodyMesh, privateAnatomyMesh), [bodyMesh, privateAnatomyMesh]);
  const regionElapsed = useRef(0);
  const regionPending = useRef(true);
  useEffect(() => { regionElapsed.current = 0; regionPending.current = true; }, [weights, posture, heightScale, wardrobe, anatomyAllowed, captureRedacted,anatomyProfile,anatomyPreview]);
  useFrame((_,delta) => {
    if (!sampleRegions || !visible || !regionPending.current) return;
    regionElapsed.current += Math.min(delta,.1);
    if (regionElapsed.current < 1) return;
    const includePrivate = anatomyAllowed && wardrobe === 'ANATOMICAL' && !captureRedacted;
    use3DStore.getState().setModelRegionFrames(cloneKey, sampleRegions(includePrivate, groupRef.current));
    regionPending.current = false;
  });
  const skinTone = useMemo(() => resolveSkinTone(renderMetrics), [renderMetrics]);
  useEffect(() => {
    if (useProcedural || !groupRef.current) return undefined;
    return registerAvatarSource(cloneKey, {
      group: groupRef.current,
      metadata: () => ({ schemaVersion: 1, metrics: { ...metrics }, weights: { ...weights }, asset: diagnostics?.modelAsset, calibrationVersion: privateDeformer ? ANATOMY_PREVIEW_VERSION : ANATOMY_CALIBRATION_VERSION,
        ...(privateAnatomyMesh?.visible ? {privateAnatomy:anatomyProfile,previewState:anatomyPreview.state} : {}) }),
    });
  }, [cloneKey, diagnostics, metrics, weights, useProcedural, visible,privateDeformer,privateAnatomyMesh,anatomyProfile,anatomyPreview.state]);

  // ── Morph interpolator ──────────────────────────────────────────────────────
  const { interpolator, updateWeights } = useMorphInterpolator(snapWeights);

  useEffect(() => {
    updateWeights(weights);
  }, [weights, updateWeights]);

  useEffect(() => {
    if (!scene || useProcedural) return;
    // Frame the complete authored avatar, not only the body primitive. This
    // includes hair, eyes, feet, clothing and visible anatomy attachments.
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
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
      v2: inspectDigitalHumanV2(diagnostics),
      activeRenderer: useProcedural ? 'procedural-production' : 'authored-glb',
      privatePreview:{available:Boolean(privateDeformer),version:privateDeformer?ANATOMY_PREVIEW_VERSION:null},
    } : null);
  }, [diagnostics, setModelDiagnostics, useProcedural,privateDeformer]);

  // Pubic hair is placed from the anatomy's skin junction (the dorsal vertex of
  // its junction ring) in centimetres of the 175 cm reference body.
  const pubicAnchor = useMemo(() => {
    const layout = privateAnatomyMesh?.userData?.layout;
    const anatomyPosition = privateAnatomyMesh?.geometry?.attributes?.position;
    const bodyPosition = bodyMesh?.geometry?.attributes?.position;
    if (!layout || !anatomyPosition || !bodyPosition) return null;
    const junction = layout.baseRing * layout.segments + layout.segments / 4;
    const bounds = new THREE.Box3().setFromBufferAttribute(bodyPosition);
    return {
      origin: [anatomyPosition.getX(junction), anatomyPosition.getY(junction), anatomyPosition.getZ(junction)],
      unitsPerCm: (bounds.max.y - bounds.min.y) / 175,
    };
  }, [bodyMesh, privateAnatomyMesh]);

  // ── Material ────────────────────────────────────────────────────────────────
  const material = useMemo(() => {
    switch (renderMode) {
      case "ghost": return createGhostMaterial(opacity);
      case "delta": return createDeltaHeatmapMaterial();
      default: {
        const toneIndex = { "I":0, "II":1, "III":2, "IV":3, "V":4, "VI":5 }[skinTone] ?? 3;
        // One body albedo for every tone: the material tints it relative to the
        // texture's own tone (physicalSkinMaterial.skinAlbedoTint). The bundled
        // "Light" variant is darker than the base and "Deep" darker than type VI.
        return createSkinMaterial(toneIndex, bodyMesh?.material || null, {
          bodyHairIntensity: renderMetrics?.bodyHairDensity ?? 0,
          skinColorHex: renderMetrics?.skinColor ?? renderMetrics?.skinColorHex,
          vertexColors: true,
          pubicRegion: pubicAnchor && {
            ...pubicAnchor,
            pattern: renderMetrics?.bodyHairPattern,
            color: renderMetrics?.bodyHairColor || renderMetrics?.hairColor || '#2c1a0a',
          },
        });
      }
    }
  }, [bodyMesh, opacity, pubicAnchor, renderMetrics, renderMode, skinTone]);

  // The protected anatomy surface uses the same tone but no body atlas. The
  // atlas is laid out for the MakeHuman body UV islands and would otherwise
  // paint unrelated chest/face pixels across the private mesh. Its own vertex
  // colours carry pigment and a procedural bump map carries the skin relief.
  const privateMaterial = useMemo(() => {
    if (renderMode !== "normal") return material;
    const toneIndex = { "I":0, "II":1, "III":2, "IV":3, "V":4, "VI":5 }[skinTone] ?? 3;
    return applyAnatomySurface(createSkinMaterial(toneIndex, null, { skinColorHex: renderMetrics?.skinColor ?? renderMetrics?.skinColorHex }));
  }, [material, renderMetrics, renderMode, skinTone]);

  useEffect(()=> {
    if(!privateDeformer) return;
    const evidence=privateDeformer.apply(anatomyProfile,{state:anatomyPreview.state,heightScale,
      baseColor:privateMaterial?.color || renderMetrics.skinColor,legacy:renderMetrics});
    anatomyEvidenceRef.current=evidence;
    privateAnatomyMesh.userData.previewEvidence=evidence;
    use3DStore.getState().setAnatomyEvidence(cloneKey,evidence);
    buttockDeformer?.(anatomyProfile,{baseColor:privateMaterial?.color});
  },[privateDeformer,privateAnatomyMesh,buttockDeformer,anatomyProfile,anatomyPreview.state,heightScale,privateMaterial,renderMetrics,cloneKey]);
  useEffect(()=>()=> {
    if(anatomyGuidesRef.current) { anatomyGuidesRef.current.removeFromParent(); anatomyGuidesRef.current.userData.dispose(); anatomyGuidesRef.current=null; }
    use3DStore.getState().setAnatomyEvidence(cloneKey,null);
    bodyMesh?.geometry.dispose();
  },[bodyMesh,cloneKey]);

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
      if (feature === 'hair') materials.hair = createHairCardMaterial(source, hairColor);
      if (STRAND_FEATURES.includes(feature)) materials[feature] = createStrandMaterial(feature, source, hairColor);
    });
    return materials;
  }, [featureMeshes, renderMetrics]);

  useEffect(() => () => {
    Object.values(featureMaterials).forEach((featureMaterial) => featureMaterial.dispose());
  }, [featureMaterials]);

  const headBone = useMemo(
    () => skeleton?.bones?.find((bone) => bone.name === 'Head') || null,
    [skeleton],
  );

  const hairStyle = renderMetrics?.hairStyle || 'short';
  const hairColor = renderMetrics?.hairColor || '#21140f';
  const hairline = useMemo(() => scalpHairline(bodyMesh?.geometry, hairStyle), [bodyMesh, hairStyle]);
  const scalpMaterial = useMemo(() => {
    if (!hairline) return null;
    // Transparent only so the hairline can fade into the skin below it.
    const scalp = new THREE.MeshPhysicalMaterial({
      color: hairColor,
      roughness: 0.62,
      metalness: 0,
      sheen: 0.3,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(hairColor).offsetHSL(0, 0, 0.1),
      transparent: true,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    // Rest-pose positions: the capped region stays the same patch of scalp
    // under every morph and pose. Offsets scale with the figure's stature.
    const unit = (fraction) => (fraction * hairline.stature).toFixed(4);
    scalp.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vGrowthTrackHairPosition;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGrowthTrackHairPosition = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vGrowthTrackHairPosition;')
        .replace('#include <alphatest_fragment>', `
          float hairFront = smoothstep(${unit(-0.0145)}, ${unit(0.0751)}, vGrowthTrackHairPosition.z);
          float hairline = mix(${hairline.back.toFixed(4)}, ${hairline.front.toFixed(4)}, hairFront);
          float centrePeak = 1.0 - smoothstep(0.0, ${unit(0.022)}, abs(vGrowthTrackHairPosition.x));
          float templeLift = smoothstep(${unit(0.0202)}, ${unit(0.0416)}, abs(vGrowthTrackHairPosition.x));
          hairline += templeLift * hairFront * ${unit(0.0023)};
          hairline -= centrePeak * hairFront * ${unit(0.0035)};
          float hairCoverage = smoothstep(hairline, hairline + ${unit(0.006)}, vGrowthTrackHairPosition.y);
          if (hairCoverage <= 0.0) discard;
          diffuseColor.a *= hairCoverage;
          #include <alphatest_fragment>
        `);
    };
    scalp.customProgramCacheKey = () => `growthtrack-scalp-${hairline.front.toFixed(4)}-${hairline.back.toFixed(4)}`;
    return scalp;
  }, [hairColor, hairline]);

  useEffect(() => () => scalpMaterial?.dispose(), [scalpMaterial]);

  // A hair-coloured scalp layer is the whole look for a buzz cut and fills the
  // gaps between hair cards for longer styles.
  useEffect(() => {
    if (useProcedural || !bodyMesh || !skeleton || !scalpMaterial || hairStyle === 'bald' || renderMode !== 'normal') return undefined;
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
      ? createClothMaterial(wardrobe, bodyMesh?.geometry,wardrobeOptions || {})
      : null
  ), [bodyMesh, renderMode, wardrobe,wardrobeOptions]);

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
      if (feature === 'hair') mesh.visible = ['short', 'medium', 'long'].includes(hairStyle);
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
    const shell=createGarmentGeometry(bodyMesh,wardrobeOptions || {});
    const overlay = new THREE.SkinnedMesh(shell.geometry, clothMaterial);
    overlay.userData.garmentShell=shell;
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
      shell.dispose();
      if (clothOverlayRef.current === overlay) clothOverlayRef.current = null;
    };
  }, [bodyMesh, cloneKey, clothMaterial, scene, skeleton, useProcedural,wardrobeOptions]);

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
        if (featureMeshes.some((feature) => feature.mesh === mesh)) return;
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
  }, [bodyMesh, featureMeshes, material, morphMeshes, privateAnatomyMesh, privateMaterial, renderMode, useProcedural]);

  useEffect(() => {
    if (!privateAnatomyMesh) return;
    // The asset loads hidden and remains hidden in ghost/delta views. Only the
    // explicit per-session reveal in the anatomy editor can make it visible.
    const visible = isAnatomyVisible({ wardrobe, renderMode, captureRedacted, eligible: anatomyAllowed });
    // eslint-disable-next-line react-hooks/immutability
    privateAnatomyMesh.visible = visible;
    // Pubic hair belongs to the same reveal; above a waistband it reads as a stain.
    const pubic = material?.uniforms?.uPubicHair;
    // eslint-disable-next-line react-hooks/immutability
    if (pubic) pubic.value = visible ? material.userData.pubicHairDensity ?? 0 : 0;
    if(anatomyGuidesRef.current) anatomyGuidesRef.current.visible=visible;
  }, [privateAnatomyMesh, material, wardrobe, captureRedacted, renderMode, anatomyAllowed]);

  // ── Per-frame morph application ─────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!bodyMesh || useProcedural) return;
    interpolator.tick(delta);
    const targets = morphMeshes?.length
      ? morphMeshes
      : [{ mesh: bodyMesh, morphIndexMap }];
    targets.forEach(({ mesh, morphIndexMap: indexMap }) => {
      interpolator.applyToMesh(mesh, indexMap);
      if(mesh === privateAnatomyMesh && privateDeformer) for(const name of ['d_length','d_girth']) {
        const index=mesh.morphTargetDictionary[name]; if(index!=null) mesh.morphTargetInfluences[index]=0;
      }
    });
    if (privateAnatomyMesh?.visible) updateAnatomyNormals?.();
    const guideSignature=anatomyPreview.guides && privateAnatomyMesh?.visible ? anatomyEvidenceRef.current : null;
    if(guideSignatureRef.current!==guideSignature) {
      if(anatomyGuidesRef.current) { anatomyGuidesRef.current.removeFromParent(); anatomyGuidesRef.current.userData.dispose(); }
      anatomyGuidesRef.current=guideSignature?createAnatomyGuides(privateAnatomyMesh,guideSignature):null;
      if(anatomyGuidesRef.current) privateAnatomyMesh.parent.add(anatomyGuidesRef.current);
      guideSignatureRef.current=guideSignature;
    }
    if (clothOverlayRef.current) {
      clothOverlayRef.current.userData.garmentShell?.update();
      interpolator.applyToMesh(clothOverlayRef.current, morphIndexMap);
    }
    if (scalpRef.current) interpolator.applyToMesh(scalpRef.current, morphIndexMap);
    if (auraRef.current) interpolator.applyToMesh(auraRef.current, morphIndexMap);
    groundElapsed.current += delta;
    if (groundElapsed.current >= 0.15) {
      groundSoles?.(0.04 / heightScale);
      groundElapsed.current = 0;
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
        skinColorHex:         renderMetrics?.skinColor ?? renderMetrics?.skinColorHex,
        vascularityIntensity: interpolator.getWeight("vascularity_intensity"),
        bodyHairIntensity:    renderMetrics?.bodyHairDensity ?? 0,
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
