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
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
} from "postprocessing";

import use3DStore from "../../store/use3DStore";

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
  const cinematic = use3DStore((state) => state.cinematicState);
  const gpuTier = use3DStore((state) => state.gpuTier);
  const highTier = gpuTier === "HIGH";
  const polishTier = gpuTier !== "LOW";
  const fullEffects = mode === "FULL" && highTier && !reducedMotion;

  const pipeline = useMemo(() => {
    const composer = new EffectComposer(gl, {
      multisampling: fullEffects ? 4 : 0,
      frameBufferType: THREE.HalfFloatType,
      depthBuffer: true,
      stencilBuffer: false,
    });
    const passes = [];
    const effects = [];

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    passes.push(renderPass);

    if (fullEffects && cinematic.depthOfField) {
      const depthOfField = new DepthOfFieldEffect(camera, {
        focusDistance: 3.25,
        focusRange: 2.2,
        bokehScale: 0.55,
        resolutionScale: 0.5,
      });
      effects.push(depthOfField);
      addEffectPass(composer, camera, depthOfField, passes);
    }

    if (polishTier && cinematic.bloom) {
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

    const finishingEffects = [];
    if (fullEffects && cinematic.chromaticAberration) {
      const chromatic = new ChromaticAberrationEffect({
        blendFunction: BlendFunction.NORMAL,
        offset: new THREE.Vector2(0.00012, 0.00008),
        radialModulation: true,
        modulationOffset: 0.34,
      });
      finishingEffects.push(chromatic);
      effects.push(chromatic);
    }

    const toneMapping = new ToneMappingEffect({
      blendFunction: BlendFunction.SRC,
      mode: ToneMappingMode.AGX,
    });
    finishingEffects.push(toneMapping);
    effects.push(toneMapping);

    if (fullEffects && cinematic.filmGrain) {
      const grain = new NoiseEffect({
        blendFunction: BlendFunction.SOFT_LIGHT,
        premultiply: true,
      });
      grain.blendMode.opacity.value = 0.012;
      finishingEffects.push(grain);
      effects.push(grain);
    }

    if (polishTier && cinematic.vignette) {
      const vignette = new VignetteEffect({
        blendFunction: BlendFunction.NORMAL,
        offset: fullEffects ? 0.34 : 0.4,
        darkness: fullEffects ? 0.36 : 0.26,
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
    cinematic.bloom,
    cinematic.chromaticAberration,
    cinematic.depthOfField,
    cinematic.filmGrain,
    cinematic.vignette,
    gl,
    fullEffects,
    polishTier,
    scene,
  ]);

  useEffect(() => {
    pipeline.composer.setSize(size.width, size.height);
  }, [pipeline, size.height, size.width]);

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
