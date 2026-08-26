/**
 * ChamberCanvas.jsx — The WebGL 3D Scene for Mirror Chamber
 * Adapted from Layer 2: Render Pipeline
 */

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree }    from "@react-three/fiber";
import { Html, AdaptiveDpr, AdaptiveEvents } from "@react-three/drei";
import * as THREE                        from "three";

import StudioLighting      from "./morphEngine/StudioLighting";
import ChamberFloor        from "./morphEngine/ChamberFloor";
import SceneEnvironment    from "./morphEngine/SceneEnvironment";
import CameraRig           from "./morphEngine/CameraRig";
import PostProcessingStack from "./morphEngine/PostProcessingStack";
import { CloneEngine, BodyPartInteraction } from "./morphEngine";
import ChamberVFX from "./morphEngine/ChamberVFX";
import use3DStore, { GPU_TIERS }            from "../store/use3DStore";
import { detectAndSetGpuTier }              from "../store/use3DStore.usage";
import TabErrorBoundary                     from "./TabErrorBoundary";

const LOD_CONFIG = {
  [GPU_TIERS.HIGH]: {
    shadowMapSize:   2048,
    shadowType:      THREE.PCFShadowMap,
    antialias:       true,
    dpr:             [1, 2],
    samples:         128,
    postFx:          "FULL",
    targetFps:       60,
  },
  [GPU_TIERS.MED]: {
    shadowMapSize:   1024,
    shadowType:      THREE.PCFShadowMap,
    antialias:       false,
    dpr:             [1, 1.5],
    samples:         64,
    postFx:          "PARTIAL",
    targetFps:       60,
  },
  [GPU_TIERS.LOW]: {
    shadowMapSize:   null,
    shadowType:      null,
    antialias:       false,
    dpr:             [0.75, 1],
    samples:         32,
    postFx:          "NONE",
    targetFps:       30,
  },
};

function applyRendererTuning(renderer, lodConfig, exposure) {
  renderer.shadowMap.enabled = Boolean(lodConfig.shadowMapSize);
  if (lodConfig.shadowType) renderer.shadowMap.type = lodConfig.shadowType;
  renderer.shadowMap.autoUpdate = Boolean(lodConfig.shadowMapSize);
  renderer.toneMappingExposure = exposure;
}

function RendererTuning({ lodConfig }) {
  const gl = useThree((state) => state.gl);
  const exposure = use3DStore((state) => state.cinematicState.exposure);

  useEffect(() => {
    applyRendererTuning(gl, lodConfig, exposure);
  }, [exposure, gl, lodConfig]);

  return null;
}

function QualityTelemetry({ reducedMotion }) {
  const gl = useThree((state) => state.gl);
  const gpuTier = use3DStore((state) => state.gpuTier);
  const setTelemetry = use3DStore((state) => state.setRendererQualityTelemetry);
  const samplesRef = useRef([]);
  const elapsedRef = useRef(0);

  useEffect(() => {
    const canvas = gl.domElement;
    const handleContextLost = (event) => {
      event.preventDefault();
      const previous = use3DStore.getState().rendererQualityTelemetry;
      setTelemetry({
        status: 'context-lost',
        contextLost: true,
        contextLossCount: (previous.contextLossCount || 0) + 1,
      });
    };
    const handleContextRestored = () => setTelemetry({ status: 'ready', contextLost: false });

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
    setTelemetry({
      status: 'ready',
      contextLost: false,
      gpuTier,
      reducedMotion,
      accessibleName: true,
      reducedMotionSupported: true,
      visibilityPauseSupported: true,
      intersectionPauseSupported: true,
    });

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost, false);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored, false);
    };
  }, [gl, gpuTier, reducedMotion, setTelemetry]);

  useFrame((_, delta) => {
    if (!Number.isFinite(delta) || delta <= 0 || delta > 0.2) return;
    const milliseconds = delta * 1000;
    const samples = samplesRef.current;
    samples.push(milliseconds);
    if (samples.length > 120) samples.shift();
    elapsedRef.current += delta;

    if (elapsedRef.current < 2 || samples.length < 30) return;
    elapsedRef.current = 0;
    const sorted = [...samples].sort((a, b) => a - b);
    const average = samples.reduce((total, sample) => total + sample, 0) / samples.length;
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    setTelemetry({
      status: 'ready',
      contextLost: false,
      gpuTier,
      frames: samples.length,
      fps: Math.round(1000 / average),
      frameTimeP95: Number(p95.toFixed(1)),
      reducedMotion,
    });
  });

  return null;
}

function CanvasScene({ lodConfig, reducedMotion }) {
  const viewMode = use3DStore((s) => s.viewMode);

  return (
    <>
      <AdaptiveDpr />
      <AdaptiveEvents />
      <RendererTuning lodConfig={lodConfig} />
      <QualityTelemetry reducedMotion={reducedMotion} />

      <Suspense fallback={null}>
        <SceneEnvironment />
      </Suspense>

      <StudioLighting lodConfig={lodConfig} />

      <ChamberVFX
        count={lodConfig.postFx === "NONE" ? 120 : lodConfig.postFx === "PARTIAL" ? 360 : 680}
        motionEnabled={!reducedMotion}
      />

      <Suspense fallback={null}>
        <ChamberFloor />
      </Suspense>

      <CameraRig />

      {lodConfig.postFx !== "NONE" && (
        <PostProcessingStack mode={lodConfig.postFx} reducedMotion={reducedMotion} />
      )}

      <Suspense fallback={null}>
        <TabErrorBoundary
          tabName="Mirror Chamber Core"
          fallback={
            <Html center style={{ pointerEvents: 'none' }}>
              <div style={{
                padding: '1rem 1.5rem',
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: '12px',
                color: '#f87171',
                fontFamily: 'var(--font-display)',
                fontSize: '0.8rem',
                textAlign: 'center',
                maxWidth: '260px',
              }}>
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>⚠ Model Unavailable</div>
                <div style={{ opacity: 0.75 }}>Place humanoid-base.glb in<br/>/public/assets/models/</div>
              </div>
            </Html>
          }
        >
          <CloneEngine />

          {(viewMode === 'SOLO' || viewMode === 'DUAL') && (
            <BodyPartInteraction clonePosition={[0, 0, 0]} />
          )}
        </TabErrorBoundary>
      </Suspense>

    </>
  );
}

function useGlCreated(setLodConfig) {
  const initialized = React.useRef(false);

  return useCallback(({ gl, camera }) => {
    if (initialized.current) return;
    initialized.current = true;

    detectAndSetGpuTier(gl);
    const tier   = use3DStore.getState().gpuTier || GPU_TIERS.HIGH;
    const config = LOD_CONFIG[tier];
    setLodConfig(config);

    // Apply tone mapping after renderer is initialized (must be set here, not in gl={} props)
    gl.toneMapping         = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.2;
    gl.outputColorSpace    = THREE.SRGBColorSpace;
    gl.shadowMap.enabled = Boolean(config.shadowMapSize);
    if (config.shadowType) gl.shadowMap.type = config.shadowType;

    camera.position.set(0, 1.25, 2.9);
    camera.fov = 36;
    camera.updateProjectionMatrix();

  }, [setLodConfig]);
}

export default function ChamberCanvas({ className = "", style = {} }) {
  const wrapperRef = useRef(null);
  const qualityStatus = use3DStore((state) => state.rendererQualityTelemetry.status);
  const [lodConfig, setLodConfig] = useState(LOD_CONFIG[GPU_TIERS.HIGH]);
  const [isIntersecting, setIsIntersecting] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(() => document.visibilityState !== 'hidden');
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const onCreated = useGlCreated(setLodConfig);

  useEffect(() => use3DStore.subscribe(
    (state) => state.gpuTier,
    (tier) => setLodConfig(LOD_CONFIG[tier] || LOD_CONFIG[GPU_TIERS.MED])
  ), []);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) => setIsIntersecting(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReducedMotion(media.matches);
    media.addEventListener?.('change', handleChange);
    return () => media.removeEventListener?.('change', handleChange);
  }, []);

  useEffect(() => {
    const handleVisibility = () => setDocumentVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const shouldRender = isIntersecting && documentVisible;

  return (
    <div ref={wrapperRef} className={className} style={{ width: '100%', height: '100%', ...style }} data-rendering={shouldRender ? 'active' : 'paused'} data-quality-status={qualityStatus} role="img" aria-label="Interactive three-dimensional physique model. Drag to rotate and use the mouse wheel or pinch gesture to zoom.">
      <Canvas
        gl={{
          powerPreference:      "high-performance",
          antialias:            lodConfig.antialias,
          alpha:                false,
          stencil:              true,
          depth:                true,
          preserveDrawingBuffer: true,
        }}
        dpr={lodConfig.dpr}
        camera={{ fov: 36, near: 0.1, far: 100 }}
        shadows={lodConfig.shadowType ? { type: lodConfig.shadowType } : false}
        frameloop={shouldRender ? "always" : "never"}
        onCreated={onCreated}
        style={{ width: "100%", height: "100%" }}
      >
        <CanvasScene lodConfig={lodConfig} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}

