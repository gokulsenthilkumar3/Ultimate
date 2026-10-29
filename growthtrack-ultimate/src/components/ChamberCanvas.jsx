/**
 * ChamberCanvas.jsx — The WebGL 3D Scene for Mirror Chamber
 * Adapted from Layer 2: Render Pipeline
 */

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree }    from "@react-three/fiber";
import { Html, AdaptiveEvents } from "@react-three/drei";
import * as THREE                        from "three";

import StudioLighting      from "./morphEngine/StudioLighting";
import ChamberFloor        from "./morphEngine/ChamberFloor";
import SceneEnvironment    from "./morphEngine/SceneEnvironment";
import CameraRig           from "./morphEngine/CameraRig";
import PostProcessingStack from "./morphEngine/PostProcessingStack";
import { CloneEngine } from "./morphEngine";
import ChamberVFX from "./morphEngine/ChamberVFX";
import use3DStore, { GPU_TIERS }            from "../store/use3DStore";
import useStore                             from "../store/useStore";
import { detectAndSetGpuTier }              from "../store/use3DStore.usage";
import TabErrorBoundary                     from "./TabErrorBoundary";
import { BODY_PART_MAP } from './morphEngine/bodyRegions';
import { BODY_METRICS } from '../lib/physiqueProfile';
import { validateBodyMetric } from '../lib/bodyMetricContract';
import { formatMeasurement }                 from "../utils/userFormatters";
import {createGovernor,observe,TIERS} from './morphEngine/qualityGovernor';
import {registerCaptureScene} from './morphEngine/captureRuntime';
import DemandRendering from './morphEngine/DemandRendering';
import ModelLoadStatus from './physique/ModelLoadStatus';
import ModelReadySignal from './physique/ModelReadySignal';

const policyTier=tier=>tier==='MED'?'BALANCED':tier;
const runtimeTier=tier=>tier==='BALANCED'?'MED':tier;
const selectedTier=preference=>({performance:'LOW',balanced:'MED',high:'HIGH'})[preference];

const LOD_CONFIG = {
  [GPU_TIERS.HIGH]: {
    shadowMapSize:   2048,
    shadowType:      THREE.PCFShadowMap,
    antialias:       true,
    dpr:             [1, 2],
    samples:         128,
    postFx:          "FULL",
    targetFps:       60,
    tier:            GPU_TIERS.HIGH,
    environmentResolution: 256,
  },
  [GPU_TIERS.MED]: {
    shadowMapSize:   1024,
    shadowType:      THREE.PCFShadowMap,
    antialias:       false,
    dpr:             [1, 1.5],
    samples:         64,
    postFx:          "PARTIAL",
    targetFps:       60,
    tier:            GPU_TIERS.MED,
    environmentResolution: 96,
  },
  [GPU_TIERS.LOW]: {
    shadowMapSize:   null,
    shadowType:      null,
    antialias:       false,
    dpr:             [0.75, 1],
    samples:         32,
    postFx:          "NONE",
    targetFps:       30,
    tier:            GPU_TIERS.LOW,
    environmentResolution: 64,
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
  const setDpr=useThree(state=>state.setDpr);

  useEffect(() => {
    applyRendererTuning(gl, lodConfig, exposure);
    const policy=TIERS[policyTier(lodConfig.tier)];
    setDpr(Math.min(window.devicePixelRatio || 1,policy.dprCap));
    gl.domElement.setAttribute('data-quality-tier',lodConfig.tier);
    gl.domElement.setAttribute('data-quality-dpr',String(gl.getPixelRatio()));
    gl.domElement.setAttribute('data-quality-shadow-map',String(lodConfig.shadowMapSize || 0));
  }, [exposure, gl, lodConfig,setDpr]);

  return null;
}

function QualityTelemetry({ reducedMotion }) {
  const gl = useThree((state) => state.gl);
  const gpuTier = use3DStore((state) => state.gpuTier);
  const setTelemetry = use3DStore((state) => state.setRendererQualityTelemetry);
  const samplesRef = useRef([]);
  const elapsedRef = useRef(0);
  const preference=use3DStore(s=>s.avatarWorkspace.qualityPreference);
  const governor=useRef(createGovernor('AUTO',policyTier(gpuTier)));

  useEffect(()=>{
    const selected=selectedTier(preference);
    governor.current=createGovernor(selected?policyTier(selected):'AUTO',policyTier(use3DStore.getState().gpuTier),{budgetMs:matchMedia('(pointer: coarse)').matches?1000/30:1000/60});
    if(selected)use3DStore.getState().setGpuTier(selected);
  },[preference]);

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
    const current=policyTier(use3DStore.getState().gpuTier);
    if(governor.current.tier!==current)governor.current={...governor.current,tier:current,samples:[],settle:45};
    const result=observe(governor.current,milliseconds,performance.now());governor.current=result.state;
    if(result.change){use3DStore.getState().setGpuTier(runtimeTier(result.change.to));setTelemetry({qualityChange:result.change.reason});}
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

function SpatialGuide({ reducedMotion }) {
  const sweepRef = useRef(null);
  const haloRef = useRef(null);

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const t = clock.elapsedTime;
    if (sweepRef.current) sweepRef.current.rotation.z = Math.sin(t * 0.34) * 0.18;
    if (haloRef.current) haloRef.current.material.opacity = 0.16 + Math.sin(t * 1.25) * 0.035;
  });

  return (
    <group name="spatial-guide" position={[0, 0.018, -0.24]}>
      <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.18, 1.19, 96]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <mesh ref={sweepRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.48, 1.486, 96, 1, 0, Math.PI * 0.24]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.22} depthWrite={false} />
      </mesh>
    </group>
  );
}

function MeasurementLandmarks() {
  const user = useStore(state => state.user);
  const viewMode = use3DStore(state => state.viewMode);
  const focus = use3DStore(state => state.focusedBodyPart);
  const context = use3DStore(state => state.avatarWorkspace.avatarContext);
  const frames = use3DStore(state => state.modelRegionFrames[context === 'goal' ? 'B' : 'A']);
  const metrics = use3DStore(state => context === 'goal' ? state.cloneB.metrics : state.cloneA.metrics);
  const width = useThree(state => state.size.width);
  const region = BODY_PART_MAP[focus];
  const frame = frames[focus];
  if (viewMode !== 'SOLO' || width < 920 || !frame || !region || region.private) return null;
  const visible = region.metrics.filter(key => BODY_METRICS.some(m => m.key === key));
  return <>{visible.map((key,index) => {
    const metric = BODY_METRICS.find(m => m.key === key);
    const record = validateBodyMetric(key,metrics[key],{ allowEmpty:false });
    const position = [frame.center[0] + frame.size[0] / 2, frame.center[1] + frame.size[1] / 2 - index * frame.size[1] / Math.max(1,visible.length), frame.center[2]];
    return <Html key={key} position={position} center style={{ pointerEvents:'none' }}>
      <div className="chamber-landmark"><span>{metric.label}</span><strong>{record.valid ? formatMeasurement(record.value,metric.unit,user,{ maximumFractionDigits:1 }) : 'Not recorded'}</strong></div>
    </Html>;
  })}</>;
}

function ModelFailure({ onFailure }) {
  useEffect(onFailure, [onFailure]);
  return <Html center><div className="avatar-model-error" role="alert">
    <strong>The 3D model could not load</strong>
    <p>Reload this view to retry. Your recorded measurements remain available in the Measurements tab.</p>
  </div></Html>;
}

function CanvasScene({ lodConfig, reducedMotion, active, onReady, onFailure }) {
  const showStage=use3DStore(state=>state.avatarWorkspace.showStage);
  const lightingMode=use3DStore(state=>state.avatarWorkspace.lightingMode);
  const stageReducedMotion = reducedMotion || lightingMode !== 'cinematic';
  const captureState=useThree();
  useEffect(()=>registerCaptureScene(captureState.gl.domElement,captureState),[captureState]);
  return (
    <>
      <AdaptiveEvents />
      <DemandRendering active={active} reducedMotion={reducedMotion} />
      <RendererTuning lodConfig={lodConfig} />
      <QualityTelemetry reducedMotion={reducedMotion} />

      <Suspense fallback={null}>
        <SceneEnvironment lodConfig={lodConfig} />
      </Suspense>

      <StudioLighting lodConfig={lodConfig} />
      {!showStage && lightingMode==='neutral' && <mesh name="neutral-contact-ground" rotation={[-Math.PI/2,0,0]} position={[0,0,0]} receiveShadow>
        <planeGeometry args={[20,20]}/><shadowMaterial transparent opacity={0.2} depthWrite={false}/>
      </mesh>}

      {showStage && <ChamberVFX
        count={lodConfig.postFx === "NONE" ? 120 : lodConfig.postFx === "PARTIAL" ? 360 : 680}
        motionEnabled={!stageReducedMotion}
      />}

      <Suspense fallback={null}>
        {showStage && <ChamberFloor />}
      </Suspense>

      <CameraRig />

      {showStage && <SpatialGuide reducedMotion={stageReducedMotion} />}
      <MeasurementLandmarks />

      <PostProcessingStack mode={lodConfig.postFx} reducedMotion={reducedMotion} />

      <Suspense fallback={null}>
        <TabErrorBoundary
          tabName="Mirror Chamber Core"
          fallback={<ModelFailure onFailure={onFailure} />}
        >
          <CloneEngine />
          <ModelReadySignal onReady={onReady} />
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

    const selected=selectedTier(use3DStore.getState().avatarWorkspace.qualityPreference);
    if(selected)use3DStore.getState().setGpuTier(selected);else detectAndSetGpuTier(gl);
    const tier   = use3DStore.getState().gpuTier || GPU_TIERS.MED;
    const config = LOD_CONFIG[tier];
    setLodConfig(config);

    // Apply tone mapping after renderer is initialized (must be set here, not in gl={} props)
    gl.toneMapping         = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.2;
    gl.outputColorSpace    = THREE.SRGBColorSpace;
    gl.shadowMap.enabled = Boolean(config.shadowMapSize);
    if (config.shadowType) gl.shadowMap.type = config.shadowType;

    camera.position.set(0, 1.12, 3.25);
    camera.fov = 30;
    camera.updateProjectionMatrix();

  }, [setLodConfig]);
}

export default function ChamberCanvas({ className = "", style = {}, children = null }) {
  const wrapperRef = useRef(null);
  const [loadStarted] = useState(() => performance.now());
  const [modelReady, setModelReady] = useState(false);
  const [modelFailed, setModelFailed] = useState(false);
  const onModelFailure = useCallback(() => setModelFailed(true), []);
  const onModelReady = useCallback(() => {
    const modelLoadMs = Math.round(performance.now() - loadStarted);
    setModelReady(true);
    use3DStore.getState().setRendererQualityTelemetry({ modelLoadMs });
    performance.measure?.('physique:model-ready', { start: loadStarted, end: performance.now() });
  }, [loadStarted]);
  const qualityStatus = use3DStore((state) => state.rendererQualityTelemetry.status);
  const [lodConfig, setLodConfig] = useState(LOD_CONFIG[GPU_TIERS.MED]);
  const [isIntersecting, setIsIntersecting] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(() => document.visibilityState !== 'hidden');
  const profileReducedMotion = useStore((state) => state.reducedMotion);
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const reducedMotion = Boolean(profileReducedMotion || systemReducedMotion);
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
    const handleChange = () => setSystemReducedMotion(media.matches);
    media.addEventListener?.('change', handleChange);
    return () => media.removeEventListener?.('change', handleChange);
  }, []);

  useEffect(() => {
    const handleVisibility = () => setDocumentVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const captureRedacted=use3DStore(s=>s.captureRedacted);
  // Render a protected frame even when offscreen; a preserved canvas must not
  // retain an earlier revealed image during a capture.
  const shouldRender = (!modelReady || isIntersecting || captureRedacted) && documentVisible;

  return (
    <div ref={wrapperRef} className={`avatar-renderer ${className}`} style={{ width: '100%', height: '100%', ...style }} data-rendering={shouldRender ? 'active' : 'paused'} data-model-ready={modelReady} data-model-error={modelFailed || undefined} data-quality-status={qualityStatus} role="group" aria-label="Interactive three-dimensional physique model. Drag to rotate and use the mouse wheel or pinch gesture to zoom.">
      <Canvas
        gl={{
          powerPreference:      "high-performance",
          antialias:            false,
          alpha:                false,
          stencil:              true,
          depth:                true,
          preserveDrawingBuffer: true,
        }}
        dpr={lodConfig.dpr}
        camera={{ fov: 30, near: 0.01, far: 100 }}
        shadows={lodConfig.shadowType ? { type: lodConfig.shadowType } : false}
        frameloop={shouldRender ? "demand" : "never"}
        onCreated={onCreated}
        style={{ width: "100%", height: "100%" }}
      >
        <CanvasScene lodConfig={lodConfig} reducedMotion={reducedMotion} active={shouldRender} onReady={onModelReady} onFailure={onModelFailure} />
        {children}
      </Canvas>
      {!modelFailed && <ModelLoadStatus ready={modelReady} />}
    </div>
  );
}

import '../styles/chamber-entry.css';
