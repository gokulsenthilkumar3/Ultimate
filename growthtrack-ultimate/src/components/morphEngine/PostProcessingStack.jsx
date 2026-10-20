/**
 * Phase 4 cinematic post-processing pipeline.
 *
 * This uses postprocessing directly instead of the React wrapper. The installed
 * wrapper still relies on an older R3F child-instance shape, which can fail on
 * R3F 9. Direct pass ownership keeps the pipeline deterministic and disposable.
 */

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  BlendFunction,
  BloomEffect,
  ChromaticAberrationEffect,
  DepthOfFieldEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  SSAOEffect,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
  SMAAEffect,
} from "postprocessing";

import use3DStore from "../../store/use3DStore";
import { resolveAvatarEffects } from '../../lib/avatarPresentation';
import {TIERS} from './qualityGovernor';
import {registerCaptureComposer} from './captureRuntime';

function addEffectPass(composer, camera, effect, passes) {
  const pass = new EffectPass(camera, effect);
  composer.addPass(pass);
  passes.push(pass);
}

function applyToneMapping(renderer, exposure) {
  const previous = {
    toneMapping: renderer.toneMapping,
    exposure: renderer.toneMappingExposure,
  };
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = exposure;
  return previous;
}

function restoreToneMapping(renderer, previous) {
  renderer.toneMapping = previous.toneMapping;
  renderer.toneMappingExposure = previous.exposure;
}

export default function PostProcessingStack({ mode, reducedMotion = false }) {
  const { gl, scene, camera, size } = useThree();
  const dpr=useThree(state=>state.viewport.dpr);
  const cinematic = use3DStore((state) => state.cinematicState);
  const gpuTier = use3DStore((state) => state.gpuTier);
  const highTier = gpuTier === "HIGH";
  const fullEffects = mode === "FULL" && highTier && !reducedMotion;
  const samples=Math.min(TIERS[gpuTier==='MED'?'BALANCED':gpuTier]?.msaa || 0,gl.capabilities.maxSamples || 0);
  const active = resolveAvatarEffects({ cinematic, gpuTier, reducedMotion, mode });
  const activeEffectNames = Object.entries(active).filter(([,enabled]) => enabled).map(([name]) => name).join(',');

  const pipeline = useMemo(() => {
    const composer = new EffectComposer(gl, {
      multisampling: samples,
      frameBufferType: THREE.HalfFloatType,
      depthBuffer: true,
      stencilBuffer: true,
    });
    const passes = [];
    const effects = [];

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    passes.push(renderPass);
    if(samples===0){const smaa=new SMAAEffect();effects.push(smaa);addEffectPass(composer,camera,smaa,passes);}

    if (active.depthOfField) {
      const depthOfField = new DepthOfFieldEffect(camera, {
        focusDistance: 3.25,
        focusRange: 2.2,
        bokehScale: 0.55,
        resolutionScale: 0.5,
      });
      effects.push(depthOfField);
      addEffectPass(composer, camera, depthOfField, passes);
    }

    if (active.bloom) {
      const bloom = new BloomEffect({
        blendFunction: BlendFunction.SCREEN,
        luminanceThreshold: fullEffects ? 0.92 : 0.96,
        luminanceSmoothing: 0.18,
        intensity: fullEffects ? 0.26 : 0.16,
        radius: 0.56,
        levels: fullEffects ? 6 : 4,
        mipmapBlur: true,
      });
      effects.push(bloom);
      addEffectPass(composer, camera, bloom, passes);
    }

    if (active.ssao) {
      const ssao = new SSAOEffect(camera, new THREE.Texture(), {
        blendFunction: BlendFunction.MULTIPLY,
        samples: 16,
        rings: 7,
        distanceThreshold: 1.0,
        distanceFalloff: 0.1,
        rangeThreshold: 0.015,
        rangeFalloff: 0.002,
        luminanceInfluence: 0.7,
        radius: 0.15,
        intensity: 1.8,
        bias: 0.025,
      });
      effects.push(ssao);
      addEffectPass(composer, camera, ssao, passes);
    }

    const finishingEffects = [];
    if (active.chromaticAberration) {
      const chromatic = new ChromaticAberrationEffect({
        blendFunction: BlendFunction.NORMAL,
        offset: new THREE.Vector2(0.00012, 0.00008),
        radialModulation: true,
        modulationOffset: 0.34,
      });
      finishingEffects.push(chromatic);
      effects.push(chromatic);
    }

    // Khronos PBR Neutral keeps base colours true; AgX desaturated the skin
    // albedo towards grey, which read as lifeless on the digital human.
    const toneMapping = new ToneMappingEffect({
      blendFunction: BlendFunction.SRC,
      mode: ToneMappingMode.NEUTRAL,
      resolution: 256,
      whitePoint: 1.0,
      middleGrey: 0.18,
      minLuminance: 0.005,
    });
    finishingEffects.push(toneMapping);
    effects.push(toneMapping);

    if (active.filmGrain && fullEffects) {
      const grain = new NoiseEffect({
        blendFunction: BlendFunction.SOFT_LIGHT,
        premultiply: true,
      });
      grain.blendMode.opacity.value = 0.012;
      finishingEffects.push(grain);
      effects.push(grain);
    }

    if (active.filmGrain) {
      const noise = new NoiseEffect({
        blendFunction: BlendFunction.COLOR_DODGE,
        premultiply: true,
      });
      // NoiseEffect has no opacity option; without this the dodge grain runs at
      // full strength and reads as speckled skin.
      noise.blendMode.opacity.value = fullEffects ? 0.08 : 0.04;
      finishingEffects.push(noise);
      effects.push(noise);
    }

    if (active.vignette) {
      const vignette = new VignetteEffect({
        eskil: false,
        offset: 0.28,
        darkness: 0.62,
        blendFunction: BlendFunction.NORMAL,
      });
      finishingEffects.push(vignette);
      effects.push(vignette);
    }

    if (finishingEffects.length > 0) {
      const finishingPass = new EffectPass(camera, ...finishingEffects);
      composer.addPass(finishingPass);
      passes.push(finishingPass);
    }

    return { composer, effects, passes };
  }, [
    camera,
    active.bloom,
    active.chromaticAberration,
    active.depthOfField,
    active.filmGrain,
    active.ssao,
    active.vignette,
    gl,
    fullEffects,
    samples,
    scene,
  ]);

  useEffect(() => {
    pipeline.composer.setSize(size.width, size.height);
  }, [pipeline, size.height, size.width,dpr]);

  useEffect(()=>{
    gl.domElement.setAttribute('data-quality-msaa',String(samples));
    gl.domElement.setAttribute('data-quality-antialias',samples?'MSAA':'SMAA');
    return registerCaptureComposer(gl.domElement,pipeline.composer);
  },[gl,pipeline,samples]);

  useEffect(() => {
    gl.domElement.setAttribute('data-active-effects', activeEffectNames);
    return () => gl.domElement.removeAttribute('data-active-effects');
  }, [gl, activeEffectNames]);

  useEffect(() => {
    const previous = applyToneMapping(gl, cinematic.exposure);
    return () => restoreToneMapping(gl, previous);
  }, [cinematic.exposure, gl]);

  useEffect(() => () => {
    pipeline.composer.dispose();
  }, [pipeline]);

  useFrame((_, delta) => {
    pipeline.composer.render(delta);
  }, 1);

  return null;
}
