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
import { useFrame, useThree }             from "@react-three/fiber";
import { useShallow }                         from "zustand/react/shallow";
import * as THREE                             from "three";
import {useTexture} from '@react-three/drei';
import {HUMAN_SURFACE} from '../../lib/humanSurface';

import { useModelLoader,buildMorphIndexMap } from "./useModelLoader";
import { useMorphInterpolator } from "./MorphInterpolator";
import PostureRig               from "./PostureRig";
import { createSkinnedBoundsUpdater } from './skinnedBounds';
import PoseTargetMarkers from './PoseTargetMarkers';
import { poseIsActive } from '../../lib/poseStudio';
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
import { measureModelSections } from './modelMeasurements';
import { registerModelMeasurement } from './modelMeasurementRuntime';
import { STRAND_FEATURES, createHairCardMaterial, createStrandMaterial, scalpHairline } from './featureMaterials';
import { APPEARANCE_DETAIL, resolveHairDetail } from '../../lib/appearanceDetail';
import { applyAnatomySurface, updateAnatomySurface } from './anatomySurface';
import { createMorphNormalUpdater } from './deformedGeometryNormals';
import { createRegionFrameSampler } from './regionFrames';
import { ANATOMY_CALIBRATION_VERSION } from './anatomyCalibration';
import { createPrivateAnatomyDeformer, createButtockDeformer, ANATOMY_PREVIEW_VERSION } from './anatomyDeformation';
import { createAnatomyGuides } from './anatomyGuides';
import { createGarmentGeometry } from './garmentGeometry';
import {createAuthoredGarment,publishGarmentEvidence} from './authoredGarments';
import {useWardrobeAsset} from './useWardrobeAsset';
import {registerCaptureGuard} from './captureRuntime';
import {protectAvatarCapture} from './protectedCapture';
import {createEyeMaterial, updateEyePupil, freezeEyePupil} from './eyeMaterial';
import { EYE_APPEARANCE } from '../../lib/eyeAppearance';
import {createIdleController, idleMotionEnabled} from './idleMotion';
import {freezeIdlePose} from './idleCapture';
import {configureSurfaceParts,updateSurfaceParts,freezeSurfaceParts} from './surfaceParts';
import {createMouthInterior} from './faceGeometry';
import {sampleAvatarSpeech} from './avatarSpeech';
import {useNativeAnatomy} from './useNativeAnatomy';

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
  const loadedModel = useModelLoader(modelPreference);
  const {bodyMesh,bodySourceMaterial,morphIndexMap,featureMeshes,surfaceParts,skeleton,scene,referenceFrame}=loadedModel;
  const wardrobe = use3DStore((s) => s.wardrobeState);
  const showStage=use3DStore(s=>s.avatarWorkspace.showStage);
  const captureRedacted = use3DStore((s) => s.captureRedacted);
  const anatomyAllowed = useAnatomyEligibility(loadedModel.diagnostics).allowed;
  const nativeAsset=loadedModel.diagnostics?.modelAsset?.nativeFamily?loadedModel.diagnostics.modelAsset:null;
  const nativeAnatomy=useNativeAnatomy(bodyMesh,nativeAsset,Boolean(nativeAsset && anatomyAllowed && wardrobe==='ANATOMICAL' && !captureRedacted));
  const nativeAttachment=nativeAnatomy.attachment;
  const privateAnatomyMesh=nativeAttachment?.mesh || loadedModel.privateAnatomyMesh;
  const morphMeshes=useMemo(()=>nativeAttachment?[...loadedModel.morphMeshes,{mesh:nativeAttachment.cage,morphIndexMap:buildMorphIndexMap(nativeAttachment.cage),sensitive:true}]:loadedModel.morphMeshes,[loadedModel.morphMeshes,nativeAttachment]);
  const diagnostics=useMemo(()=>nativeAsset?{...loadedModel.diagnostics,privateAssetStatus:nativeAnatomy.status,privateAssetError:nativeAnatomy.error}:loadedModel.diagnostics,[loadedModel.diagnostics,nativeAsset,nativeAnatomy.status,nativeAnatomy.error]);
  const microSource=useTexture(`${import.meta.env.BASE_URL}${HUMAN_SURFACE.micro.heightPath}`);
  const microTile=useMemo(()=>{const tile=microSource.clone();tile.wrapS=tile.wrapT=THREE.RepeatWrapping;tile.colorSpace=THREE.NoColorSpace;tile.needsUpdate=true;return tile;},[microSource]);
  useEffect(()=>()=>microTile.dispose(),[microTile]);
  const updateSkinBounds=useMemo(()=>{
    const skins=[bodyMesh,privateAnatomyMesh,...(surfaceParts || []).map(p=>p.mesh)].filter(mesh=>mesh?.isSkinnedMesh);
    const updaters=skins.map(mesh=>({mesh,update:createSkinnedBoundsUpdater(mesh)}));
    return()=>updaters.forEach(({mesh,update})=>{if(mesh.visible)update();});
  },[bodyMesh,privateAnatomyMesh,surfaceParts]);
  const useProcedural = !bodyMesh || diagnostics?.isSuspicious;
  const updateAnatomyNormals = useMemo(() => createMorphNormalUpdater(privateAnatomyMesh), [privateAnatomyMesh]);
  useEffect(() => () => {
    updateAnatomyNormals?.dispose();
    if(!privateAnatomyMesh?.userData.nativeBinding)privateAnatomyMesh?.geometry.dispose();
  }, [updateAnatomyNormals, privateAnatomyMesh]);
  const groundSoles = useMemo(() => bodyMesh && scene ? createSoleGrounder(bodyMesh, scene) : null, [bodyMesh, scene]);
  const groundElapsed = useRef(1);
  const setModelFrame = use3DStore((s) => s.setModelFrame);
  const setModelDiagnostics = use3DStore((s) => s.setModelDiagnostics);
  const gpuTier = use3DStore((s) => s.gpuTier);
  const wardrobeOptions=use3DStore(s=>s.wardrobePreferences.outfits[s.wardrobeState] || null);
  const wardrobeAsset=useWardrobeAsset(wardrobe,wardrobeOptions,renderMode==='normal' && isClothPreset(wardrobe));
  const renderer=useThree(state=>state.gl);
  const animationState = use3DStore((s) => s.animationState);
  const reducedMotion=use3DStore(s=>s.rendererQualityTelemetry.reducedMotion);
  const measurementView=use3DStore(s=>s.avatarWorkspace.inspectorOpen && ['measurements','anatomy'].includes(s.avatarWorkspace.inspectorSection));
  const naturalMotion=use3DStore(s=>s.avatarWorkspace.naturalMotion);
  const viewMode=use3DStore(s=>s.viewMode);
  const savedPose=use3DStore(s=>s.avatarWorkspace.poseStudio[cloneKey==='B'?'goal':'current']);
  // Workspace validation clones nested preferences. Resample only an actual
  // pose change, so changing a background/layout cannot reset a panned camera.
  const poseSignature=JSON.stringify(savedPose);
  const poseInspector=use3DStore(s=>s.avatarWorkspace.inspectorOpen && s.avatarWorkspace.inspectorSection==='pose');
  const poseActive=poseIsActive({pose:savedPose,viewMode,measurementView,renderMode,overridden:Boolean(metricsOverride || weightsOverride)});
  const idleController=useMemo(()=>createIdleController(cloneKey==='A'?17:29),[cloneKey]);
  const idleSample=useRef({blink:0,breath:0,gaze:{yaw:0,pitch:0},active:false});
  const breathingBone=useMemo(()=>skeleton?.bones.find(bone=>/^(?:Spine2|mixamorigSpine2|Bip01_Spine2)$/i.test(bone.name)),[skeleton]);
  const breathingRestScale=useMemo(()=>breathingBone?.scale.clone(),[breathingBone]);
  const anatomyProfile = use3DStore(s => s.anatomyCustomization[cloneKey === 'B' ? 'goal' : 'current']);
  const anatomyPreview = use3DStore(s => s.anatomyPreview);
  const privateDeformer=useMemo(()=>nativeAttachment?.deformer || createPrivateAnatomyDeformer(privateAnatomyMesh,bodyMesh),[privateAnatomyMesh,bodyMesh,nativeAttachment]);
  useEffect(()=>()=>{if(!nativeAttachment)privateDeformer?.dispose();},[privateDeformer,nativeAttachment]);
  const buttockDeformer=useMemo(()=>createButtockDeformer(bodyMesh,privateDeformer?.junction),[bodyMesh,privateDeformer]);
  const anatomyEvidenceRef=useRef(null);
  const anatomyEvidenceTimeRef=useRef(0);
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
  const measurementInput = JSON.stringify({ weights, metrics, anatomyProfile });
  const measurementAvailable = !useProcedural && diagnostics?.modelAsset?.isBundled && !metricsOverride && !weightsOverride;
  useEffect(() => {
    if (!measurementAvailable) return;
    const input = JSON.parse(measurementInput);
    return registerModelMeasurement(renderer.domElement, cloneKey, {
      read: () => measureModelSections(bodyMesh, input.weights, input.metrics),
    });
  }, [renderer, cloneKey, bodyMesh, measurementInput, measurementAvailable]);
  const heightScale = useMemo(
    () => computeHeightScale(renderMetrics),
    [renderMetrics],
  );
  const sampleRegions = useMemo(() => createRegionFrameSampler(bodyMesh, privateAnatomyMesh), [bodyMesh, privateAnatomyMesh]);
  const regionElapsed = useRef(0);
  const regionPending = useRef(true);
  // A quality change replaces the geometry/atlas even if measurements stay
  // identical. Resample that asset instead of retaining the former LOD's zoom.
  useEffect(() => { regionElapsed.current = 0; regionPending.current = true; }, [sampleRegions,weights, posture, heightScale, wardrobe, anatomyAllowed, captureRedacted,anatomyProfile,anatomyPreview,poseSignature,poseActive]);
  useFrame((_,delta) => {
    if (!sampleRegions || !visible || !regionPending.current) return;
    regionElapsed.current += Math.min(delta,.1);
    if (regionElapsed.current < 1) return;
    const includePrivate = anatomyAllowed && wardrobe === 'ANATOMICAL' && !captureRedacted;
    use3DStore.getState().setModelRegionFrames(cloneKey, sampleRegions(includePrivate, groupRef.current));
    regionPending.current = false;
  });
  const skinTone = useMemo(() => resolveSkinTone(renderMetrics), [renderMetrics]);
  useEffect(()=>configureSurfaceParts(surfaceParts,featureMeshes,{nailColor:renderMetrics.nailColor}),[surfaceParts,featureMeshes,renderMetrics.nailColor]);
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
    if (!referenceFrame || useProcedural) return;
    // The loader measures the complete neutral avatar precisely before viewer
    // parenting. Animated culling envelopes must not change saved-view scale.
    const {size,center}=referenceFrame;
    
    // Auto-normalize scale and position for arbitrary GLBs
    setModelFrame({
      center: center.clone().setY(center.y * heightScale),
      size: size.clone().setY(size.y * heightScale),
      height: Math.max(size.y * heightScale, 0.001),
      radius: Math.max(size.x, size.y * heightScale, size.z) * 0.5,
    });
  }, [referenceFrame, heightScale, setModelFrame, useProcedural]);

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
    if(privateAnatomyMesh?.userData.nativeBinding)return {origin:privateAnatomyMesh.userData.nativeBinding.junction,unitsPerCm:privateDeformer.unit};
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
  }, [bodyMesh, privateAnatomyMesh,privateDeformer]);

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
        return createSkinMaterial(toneIndex, bodySourceMaterial || null, {
          bodyHairIntensity: renderMetrics?.bodyHairDensity ?? 0,
          skinColorHex: renderMetrics?.skinColor ?? renderMetrics?.skinColorHex,
          skinAppearance:renderMetrics,
          microTile,
          vertexColors: true,
          pubicRegion: pubicAnchor && {
            ...pubicAnchor,
            pattern: renderMetrics?.bodyHairPattern,
            color: renderMetrics?.bodyHairColor || renderMetrics?.hairColor || '#2c1a0a',
          },
        });
      }
    }
  }, [bodySourceMaterial, microTile, opacity, pubicAnchor, renderMetrics, renderMode, skinTone]);

  // The protected anatomy surface uses the same tone but no body atlas. The
  // atlas is laid out for the MakeHuman body UV islands and would otherwise
  // paint unrelated chest/face pixels across the private mesh. Its own vertex
  // colours carry pigment and a procedural bump map carries the skin relief.
  const privateMaterial = useMemo(() => {
    if (renderMode !== "normal") return material;
    const toneIndex = { "I":0, "II":1, "III":2, "IV":3, "V":4, "VI":5 }[skinTone] ?? 3;
    return applyAnatomySurface(createSkinMaterial(toneIndex, privateAnatomyMesh?.nativeSourceMaterial || null, {
      skinColorHex: renderMetrics?.skinColor ?? renderMetrics?.skinColorHex,skinAppearance:renderMetrics,
      surfaceDetail:true,microTile,
    }));
  }, [material, microTile, renderMetrics, renderMode, skinTone,privateAnatomyMesh]);

  useEffect(()=> {
    // The atlas-free private surface shares the same pore detail quality gate.
    // Three.js uniforms are imperative renderer resources, outside React state.
    // eslint-disable-next-line react-hooks/immutability
    if(privateMaterial?.uniforms?.uSkinMicroDetail) privateMaterial.uniforms.uSkinMicroDetail.value=gpuTier!=='LOW'?1:0;
  },[privateMaterial,gpuTier]);

  useEffect(()=>{
    if(useProcedural || !visible)return;
    return registerCaptureGuard(renderer.domElement,()=>protectAvatarCapture({body:bodyMesh,
      privateMesh:privateAnatomyMesh,guides:anatomyGuidesRef.current,material,wardrobe}),20);
  },[renderer,bodyMesh,privateAnatomyMesh,material,wardrobe,useProcedural,visible]);

  useEffect(()=> {
    if(!privateDeformer){
      anatomyEvidenceRef.current=null;
      use3DStore.getState().setAnatomyEvidence(cloneKey,null);
      return;
    }
    const evidence=privateDeformer.apply(anatomyProfile,{state:anatomyPreview.state,heightScale,
      baseColor:privateMaterial?.color || renderMetrics.skinColor,legacy:renderMetrics});
    anatomyEvidenceRef.current=evidence;
    updateAnatomySurface(privateMaterial,evidence);
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
    const eyeColor = renderMetrics?.eyeColor || EYE_APPEARANCE.defaults.color;
    const hairColor = renderMetrics?.hairColor || APPEARANCE_DETAIL.hair.defaults.color;
    const materials = {};
    (featureMeshes || []).forEach(({ mesh, sourceMaterial, feature }) => {
      const source = Array.isArray(sourceMaterial) ? sourceMaterial[0] : sourceMaterial;
      if (feature === 'eyes') {
        materials.eyes = createEyeMaterial(source,mesh.geometry,eyeColor,bodySourceMaterial?.normalMap, {
          eyePupilMode: renderMetrics?.eyePupilMode, eyePupilSizeMm: renderMetrics?.eyePupilSizeMm,
          eyeIrisDetail: renderMetrics?.eyeIrisDetail, eyeSeed: renderMetrics?.eyeSeed,
          irisLimbalRing: renderMetrics?.irisLimbalRing, scleraColor: renderMetrics?.scleraColor,
          exposure: renderer.toneMappingExposure,
        });
      }
      if (feature === 'hair') materials.hair = createHairCardMaterial(source, hairColor, {
        hairDensity: renderMetrics?.hairDensity, hairGrey: renderMetrics?.hairGrey, hairSeed: renderMetrics?.hairSeed,
      });
      if (STRAND_FEATURES.includes(feature)) materials[feature] = createStrandMaterial(feature, source, hairColor);
    });
    return materials;
  }, [bodySourceMaterial, featureMeshes, renderer, renderMetrics?.eyeColor, renderMetrics?.hairColor, renderMetrics?.hairDensity, renderMetrics?.hairGrey, renderMetrics?.hairSeed,
    renderMetrics?.eyePupilMode, renderMetrics?.eyePupilSizeMm, renderMetrics?.eyeIrisDetail, renderMetrics?.eyeSeed, renderMetrics?.irisLimbalRing, renderMetrics?.scleraColor]);

  useEffect(() => () => {
    Object.values(featureMaterials).forEach((featureMaterial) => {
      featureMaterial.userData.depthMaterial?.dispose();
      featureMaterial.userData.distanceMaterial?.dispose();
      featureMaterial.dispose();
    });
  }, [featureMaterials]);
  useEffect(()=>{
    if(useProcedural || !visible)return;
    return registerCaptureGuard(renderer.domElement,()=>{
      const bindings=(morphMeshes || []).map(binding=>({...binding,skip:(binding.mesh===privateAnatomyMesh || binding.mesh===privateDeformer?.solverMesh) && privateDeformer?['d_length','d_girth']:[]}));
      for(const mesh of [clothOverlayRef.current,scalpRef.current,auraRef.current])if(mesh)bindings.push({mesh,morphIndexMap});
      const restore=interpolator.freezeForCapture(weights,bindings);
      const uniforms=bodyMesh?.material?.uniforms,vascularity=uniforms?.uVascularityIntensity;
      const previousVascularity=vascularity?.value;
      if(vascularity)vascularity.value=interpolator.getWeight('vascularity_intensity');
      const restoreFrame=()=>{restore();if(vascularity)vascularity.value=previousVascularity;};
      const updateDerived=()=>{clothOverlayRef.current?.userData.garmentShell?.update();updateAnatomyNormals?.();updateSkinBounds();privateDeformer?.updateDetails();mouthRef.current?.update();};
      try{updateDerived();}catch(error){restoreFrame();updateDerived();throw error;}
      return {restore:restoreFrame,afterRestore:updateDerived};
    },-20);
  },[renderer,useProcedural,visible,morphMeshes,morphIndexMap,privateAnatomyMesh,privateDeformer,interpolator,weights,updateSkinBounds,bodyMesh,updateAnatomyNormals]);
  useEffect(()=>{
    if(useProcedural || !visible)return;
    return registerCaptureGuard(renderer.domElement,()=>{
      const restoreIdle=freezeIdlePose({
        meshes:(morphMeshes || [{mesh:bodyMesh}]).map(item=>item.mesh),eyeMaterial:featureMaterials.eyes,
        breathingBone,breathingRestScale,manualBlink:interpolator.getWeight('blink'),
      });
      const restorePupil=freezeEyePupil(featureMaterials.eyes,renderer.toneMappingExposure);
      const restoreParts=freezeSurfaceParts(surfaceParts,bodyMesh,interpolator.getWeight('blink'),renderMode);
      const jaws=(morphMeshes || []).flatMap(({mesh,morphIndexMap:map})=>map.jaw_open==null?[]:[{mesh,index:map.jaw_open,value:mesh.morphTargetInfluences[map.jaw_open]}]);
      jaws.forEach(({mesh,index})=>{mesh.morphTargetInfluences[index]=interpolator.getWeight('jaw_open');});mouthRef.current?.update();
      return()=>{restoreParts();restorePupil();restoreIdle();jaws.forEach(({mesh,index,value})=>{mesh.morphTargetInfluences[index]=value;});mouthRef.current?.update();};
    },10);
  },[renderer,useProcedural,visible,morphMeshes,bodyMesh,featureMaterials,breathingBone,breathingRestScale,interpolator,surfaceParts,renderMode]);
  useEffect(()=>()=>{featureMeshes?.forEach(({mesh})=>mesh.geometry.dispose());},[featureMeshes]);
  useEffect(()=>()=>{surfaceParts?.forEach(({mesh})=>mesh.geometry.dispose());},[surfaceParts]);

  useEffect(()=>{
    if(useProcedural || renderMode!=='normal')return;
    const mouth=createMouthInterior(bodyMesh);mouthRef.current=mouth;
    return()=>{mouth?.dispose();if(mouthRef.current===mouth)mouthRef.current=null;};
  },[bodyMesh,useProcedural,renderMode]);

  const hairStyle = renderMetrics?.hairStyle || 'short';
  const hairColor = renderMetrics?.hairColor || APPEARANCE_DETAIL.hair.defaults.color;
  const hairDetail = resolveHairDetail(renderMetrics);
  const hairline = useMemo(() => scalpHairline(bodyMesh?.geometry, hairStyle), [bodyMesh, hairStyle]);
  const scalpMaterial = useMemo(() => {
    if (!hairline) return null;
    // Transparent only so the hairline can fade into the skin below it.
    const scalp = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(hairColor).lerp(new THREE.Color(APPEARANCE_DETAIL.hair.greyColor), hairDetail.grey),
      roughness: 0.62,
      metalness: 0,
      sheen: 0.3,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(hairColor).offsetHSL(0, 0, 0.1),
      transparent: true,
      opacity: hairDetail.density,
      depthWrite: false,
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
  }, [hairColor, hairline, hairDetail.density, hairDetail.grey]);

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
      ? createClothMaterial(wardrobe, bodyMesh?.geometry,wardrobeOptions || {},wardrobeAsset)
      : null
  ), [bodyMesh, renderMode, wardrobe,wardrobeOptions,wardrobeAsset]);

  // Aura materials are GPU resources. Creating one in JSX would allocate a
  // fresh material on every parent render and leak the old shader until the
  // WebGL context is reclaimed. Keep one material per aura lifecycle and
  // dispose it when the lifecycle ends.
  const auraMaterial = useMemo(
    () => (showAura && bodyMesh && skeleton ? createRimAuraMaterial() : null),
    [bodyMesh, showAura, skeleton],
  );

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
      if (feature === 'hair') {
        mesh.visible = ['short', 'medium', 'long'].includes(hairStyle) && hairDetail.density > 0;
        mesh.customDepthMaterial = renderMode === 'normal' ? next?.userData.depthMaterial : undefined;
        mesh.customDistanceMaterial = renderMode === 'normal' ? next?.userData.distanceMaterial : undefined;
      }
      mesh.renderOrder = renderMode === 'ghost' ? 3 : 0;
      mesh.castShadow = renderMode === 'normal';
      mesh.receiveShadow = false;
    });
  }, [featureMeshes, featureMaterials, hairStyle, hairDetail.density, material, renderMode]);

  const garmentMesh=wardrobeAsset?.mesh;
  const fit=wardrobeOptions?.fit,easeCm=wardrobeOptions?.easeCm,hemLength=wardrobeOptions?.hemLength,waistRiseCm=wardrobeOptions?.waistRiseCm;
  const garmentFit=useMemo(()=>({fit,easeCm,hemLength,waistRiseCm}),[fit,easeCm,hemLength,waistRiseCm]);
  const garmentShell=useMemo(() => {
    if(renderMode!=="normal" || !isClothPreset(wardrobe) || useProcedural || !bodyMesh || !scene || !skeleton)return null;
    return createAuthoredGarment(bodyMesh,garmentMesh,garmentFit) || createGarmentGeometry(bodyMesh,garmentFit);
  }, [bodyMesh,scene,skeleton,useProcedural,renderMode,wardrobe,garmentMesh,
    garmentFit]);
  useEffect(()=>()=>garmentShell?.dispose(),[garmentShell]);

  // Separate authored garment topology follows measured body changes through
  // surface bindings and shares the pose rig. Custom assets retain the shell
  // fallback when they do not match the approved binding topology.
  useEffect(() => {
    if(!clothMaterial) {publishGarmentEvidence(renderer.domElement,wardrobe,null);return undefined;}
    if (useProcedural || !bodyMesh || !scene || !skeleton) return undefined;
    const parent = bodyMesh.parent || scene;
    const shell=garmentShell;
    if(!shell)return undefined;
    const restoreBody=shell.authored?clothMaterial.userData.maskBody(material,bodyMesh):null;
    const overlay = new THREE.SkinnedMesh(shell.geometry, clothMaterial);
    overlay.userData.garmentShell=shell;
    overlay.name = `GrowthTrackCloth_${cloneKey}`;
    if(!shell.authored) {
      overlay.morphTargetDictionary = bodyMesh.morphTargetDictionary;
      overlay.morphTargetInfluences = new Float32Array(bodyMesh.morphTargetInfluences?.length || 0);
    }
    overlay.bind(skeleton, bodyMesh.bindMatrix);
    overlay.position.copy(bodyMesh.position);
    overlay.quaternion.copy(bodyMesh.quaternion);
    overlay.scale.copy(bodyMesh.scale);
    overlay.renderOrder = 1;
    overlay.frustumCulled = false;
    overlay.castShadow = true;
    overlay.receiveShadow = true;
    overlay.customDepthMaterial=clothMaterial.userData.depthMaterial;
    overlay.customDistanceMaterial=clothMaterial.userData.distanceMaterial;
    parent.add(overlay);
    clothOverlayRef.current = overlay;
    publishGarmentEvidence(renderer.domElement,wardrobe,shell,wardrobeOptions?.variant);

    return () => {
      parent.remove(overlay);
      restoreBody?.();
      if (clothOverlayRef.current === overlay) clothOverlayRef.current = null;
    };
  }, [bodyMesh, cloneKey, clothMaterial, scene, skeleton, useProcedural,garmentShell,wardrobe,wardrobeOptions?.variant,renderer,material]);

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
        if (surfaceParts?.some(part=>part.mesh===mesh)) return;
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
  }, [bodyMesh, featureMeshes, surfaceParts, material, morphMeshes, privateAnatomyMesh, privateMaterial, renderMode, useProcedural]);

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
    const motion=idleController.advance(delta,idleMotionEnabled({
      naturalMotion:naturalMotion && !poseActive,reducedMotion,measurementView,capturing:captureRedacted,visible,
      current:cloneKey==='A' && !metricsOverride && !weightsOverride,
      solo:viewMode==='SOLO',normal:renderMode==='normal',
      playing:animationState?.playing!==false,animationId:animationState?.animationId,
    }),interpolator.getWeight('blink'));
    idleSample.current=motion;
    const spokenJaw=visible && viewMode==='SOLO' && !measurementView && !captureRedacted && renderMode==='normal'
      ? sampleAvatarSpeech(renderer.domElement,cloneKey==='B'?'goal':'current') : null;
    // Three.js metadata belongs to the imperative render loop.
    // eslint-disable-next-line react-hooks/immutability
    bodyMesh.userData.speech={active:spokenJaw!==null,jaw:spokenJaw,context:cloneKey==='B'?'goal':'current'};
    const targets = morphMeshes?.length
      ? morphMeshes
      : [{ mesh: bodyMesh, morphIndexMap }];
    targets.forEach(({ mesh, morphIndexMap: indexMap }) => {
      interpolator.applyToMesh(mesh, indexMap);
      const blinkIndex=indexMap?.blink;
      if(blinkIndex!=null)mesh.morphTargetInfluences[blinkIndex]=motion.blink;
      if(spokenJaw!==null && indexMap?.jaw_open!=null)mesh.morphTargetInfluences[indexMap.jaw_open]=spokenJaw;
      if((mesh === privateAnatomyMesh || mesh===privateDeformer?.solverMesh) && privateDeformer) for(const name of ['d_length','d_girth']) {
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
      if(!clothOverlayRef.current.userData.garmentShell?.authored) interpolator.applyToMesh(clothOverlayRef.current, morphIndexMap);
    }
    if (scalpRef.current) interpolator.applyToMesh(scalpRef.current, morphIndexMap);
    if (auraRef.current) interpolator.applyToMesh(auraRef.current, morphIndexMap);
    groundElapsed.current += delta;
    if (groundElapsed.current >= 0.15) {
      groundSoles?.((showStage?0.04:0.005) / heightScale);
      groundElapsed.current = 0;
    }

    (featureMeshes || []).forEach(({ mesh, feature }) => {
      if(feature==='eyelashes' && bodyMesh.userData.eyelidCorrective) mesh.visible=motion.blink<HUMAN_SURFACE.eyelashClosureThreshold;
      if (feature === "eyes") {
        mesh.visible=true;
        mesh.material?.userData?.gaze?.value.set(motion.gaze.yaw,motion.gaze.pitch);
        updateEyePupil(mesh.material,renderer.toneMappingExposure,delta,
          reducedMotion || measurementView || captureRedacted || animationState?.playing===false);
      }
    });
    updateSurfaceParts(surfaceParts,bodyMesh,motion.blink,motion.gaze,renderMode);
    // Three.js scene metadata is imperative renderer state, outside React.
    bodyMesh.userData.idleMotion={active:motion.active,blink:motion.blink,breath:motion.breath,gaze:motion.gaze};

    // Shader uniforms for Layer 4 materials
    if (bodyMesh.material?.uniforms) {
      updateSkinUniforms(bodyMesh.material, {
        fitzpatrickIndex:     interpolator.getWeight("fitzpatrick_index"),
        skinColorHex:         renderMetrics?.skinColor ?? renderMetrics?.skinColorHex,
        vascularityIntensity: interpolator.getWeight("vascularity_intensity"),
        bodyHairIntensity:    renderMetrics?.bodyHairDensity ?? 0,
        microDetail:          gpuTier!=='LOW',
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
  }, -1);

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

      {/* Posture bone rig — drives skeleton from measurements + animation presets */}
      <PostureRig
        skeleton={skeleton}
        posture={posture}
        idleSample={idleSample}
        pose={poseActive?savedPose:null}
        bodyMesh={bodyMesh}
        onPoseApplied={()=>{updateSkinBounds();if(privateAnatomyMesh?.visible){
          privateDeformer?.updateDetails();anatomyGuidesRef.current?.userData.update?.();
          const now=performance.now();
          if(privateDeformer?.getEvidence && now-anatomyEvidenceTimeRef.current>250){
            const evidence=privateDeformer.getEvidence();
            if(evidence?.rendered!==anatomyEvidenceRef.current?.rendered){
              anatomyEvidenceRef.current=evidence;use3DStore.getState().setAnatomyEvidence(cloneKey,evidence);
            }
            anatomyEvidenceTimeRef.current=now;
          }
        }mouthRef.current?.update();}}
        neutral={measurementView || viewMode!=='SOLO'}
        animationId={measurementView || viewMode!=='SOLO' || reducedMotion && !animationState.userInitiated ? 'standing' : animationState?.animationId || 'idle'}
        playing={!poseActive && !measurementView && viewMode==='SOLO' && animationState?.playing !== false && (!reducedMotion || animationState.userInitiated)}
        speed={animationState?.speed || 1}
        sampleTime={animationState?.sampleTime}
      />
      <PoseTargetMarkers bodyMesh={bodyMesh} targets={savedPose.targets} joints={savedPose.joints} context={cloneKey==='B'?'goal':'current'} visible={poseActive && poseInspector && !captureRedacted}/>
    </group>
  );
}
