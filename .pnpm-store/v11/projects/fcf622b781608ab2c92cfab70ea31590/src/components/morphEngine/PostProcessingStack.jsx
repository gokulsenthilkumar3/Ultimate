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

  const pipeline = useMemo(() => {
    const composer = new EffectComposer(gl, {
      multisampling: mode === "FULL" ? 4 : 0,
      frameBufferType: THREE.HalfFloatType,
      depthBuffer: true,
      stencilBuffer: false,
    });
    const passes = [];
    const effects = [];

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    passes.push(renderPass);

    if (mode === "FULL" && cinematic.depthOfField && !reducedMotion) {
      const depthOfField = new DepthOfFieldEffect(camera, {
        focusDistance: 3.25,
        focusRange: 1.7,
        bokehScale: 0.9,
        resolutionScale: 0.5,
      });
      effects.push(depthOfField);
      addEffectPass(composer, camera, depthOfField, passes);
    }

    if (cinematic.bloom) {
      const bloom = new BloomEffect({
        blendFunction: BlendFunction.SCREEN,
        luminanceThreshold: mode === "FULL" ? 0.82 : 0.9,
        luminanceSmoothing: 0.12,
        intensity: mode === "FULL" ? 0.52 : 0.34,
        radius: 0.68,
        levels: mode === "FULL" ? 7 : 5,
        mipmapBlur: true,
      });
      effects.push(bloom);
      addEffectPass(composer, camera, bloom, passes);
    }

    const finishingEffects = [];
    if (mode === "FULL" && cinematic.chromaticAberration && !reducedMotion) {
      const chromatic = new ChromaticAberrationEffect({
        blendFunction: BlendFunction.NORMAL,
        offset: new THREE.Vector2(0.00032, 0.00022),
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

    if (mode === "FULL" && cinematic.filmGrain && !reducedMotion) {
      const grain = new NoiseEffect({
        blendFunction: BlendFunction.SOFT_LIGHT,
        premultiply: true,
      });
      grain.blendMode.opacity.value = 0.026;
      finishingEffects.push(grain);
      effects.push(grain);
    }

    if (cinematic.vignette) {
      const vignette = new VignetteEffect({
        blendFunction: BlendFunction.NORMAL,
        offset: mode === "FULL" ? 0.28 : 0.34,
        darkness: mode === "FULL" ? 0.72 : 0.58,
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
    mode,
    reducedMotion,
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
