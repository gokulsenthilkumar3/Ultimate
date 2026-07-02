/**
 * GrowthTrack Ultimate — Layer 2: Render Pipeline
 * HumanoidViewer.jsx
 *
 * Root R3F canvas. Owns:
 *  - WebGL2 context + tone mapping + shadow config (GPU-tier aware)
 *  - Scene composition: lighting, floor, environment, camera rig
 *  - GPU tier detection on gl creation
 *  - EffectComposer post-processing pipeline (see Layer 4)
 *  - Suspense boundaries + perf monitor
 *
 * Deps:
 *   npm install @react-three/fiber @react-three/drei @react-three/postprocessing
 *               three zustand@5
 */

import React, { Suspense, useEffect, useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats, AdaptiveDpr, AdaptiveEvents, Preload } from "@react-three/drei";
import * as THREE from "three";

import StudioLighting      from "./StudioLighting";
import ChamberFloor        from "./ChamberFloor";
import SceneEnvironment    from "./SceneEnvironment";
import CameraRig           from "./CameraRig";
import PostProcessingStack from "./PostProcessingStack"; // Layer 4 — wired in here

import use3DStore, { GPU_TIERS }    from "../store/use3DStore";
import { detectAndSetGpuTier }      from "../store/use3DStore.usage";

// ─────────────────────────────────────────────────────────────────────────────
// LOD CONFIGURATION — per GPU tier
// ─────────────────────────────────────────────────────────────────────────────

const LOD_CONFIG = {
  [GPU_TIERS.HIGH]: {
    shadowMapSize:   4096,
    shadowType:      THREE.PCFSoftShadowMap,
    antialias:       true,   // MSAA 4x (handled by WebGL multisampling)
    dpr:             [1, 2], // up to device pixel ratio 2
    samples:         128,
    postFx:          "FULL",
    targetFps:       60,
  },
  [GPU_TIERS.MED]: {
    shadowMapSize:   2048,
    shadowType:      THREE.PCFSoftShadowMap,
    antialias:       false,  // FXAA via post-processing instead
    dpr:             [1, 1.5],
    samples:         64,
    postFx:          "PARTIAL", // Bloom + Vignette only
    targetFps:       60,
  },
  [GPU_TIERS.LOW]: {
    shadowMapSize:   null,   // shadows off
    shadowType:      null,
    antialias:       false,
    dpr:             [0.75, 1],
    samples:         32,
    postFx:          "NONE",
    targetFps:       30,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS SCENE — inner component (has access to gl, camera, etc.)
// ─────────────────────────────────────────────────────────────────────────────

function CanvasScene({ lodConfig }) {
  return (
    <>
      {/* ── Adaptive performance helpers ── */}
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />

      {/* ── Environment (HDRI) ── */}
      <Suspense fallback={null}>
        <SceneEnvironment />
      </Suspense>

      {/* ── Lighting rig ── */}
      <StudioLighting lodConfig={lodConfig} />

      {/* ── Reflective floor ── */}
      <Suspense fallback={null}>
        <ChamberFloor />
      </Suspense>

      {/* ── Camera + orbit controls ── */}
      <CameraRig />

      {/* ── Post-processing (Layer 4) — only when GPU supports it ── */}
      {lodConfig.postFx !== "NONE" && (
        <PostProcessingStack mode={lodConfig.postFx} />
      )}

      {/* ── 3D Model goes here (Layer 3 output) ── */}
      <Suspense fallback={null}>
        {/* <CloneEngine /> */}
        {/* Placeholder: layer 3 CloneEngine mounts here */}
      </Suspense>

      {/* ── Dev stats (remove in prod) ── */}
      {process.env.NODE_ENV === "development" && <Stats />}

      {/* ── Preload all draco/ktx2 assets ── */}
      <Preload all />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GL CREATION CALLBACK
// Called once when the WebGL context is created — detects GPU tier,
// configures shadow map, sets exposure, tone mapping.
// ─────────────────────────────────────────────────────────────────────────────

function useGlCreated(setLodConfig) {
  return useCallback(({ gl, camera, scene }) => {
    // ── Detect GPU tier ──────────────────────────────────────────────────────
    detectAndSetGpuTier(gl);
    const tier   = use3DStore.getState().gpuTier;
    const config = LOD_CONFIG[tier];
    setLodConfig(config);

    // ── Tone mapping & exposure ──────────────────────────────────────────────
    gl.toneMapping         = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.15;
    gl.outputColorSpace    = THREE.SRGBColorSpace;

    // ── Shadow map ──────────────────────────────────────────────────────────
    if (config.shadowMapSize) {
      gl.shadowMap.enabled = true;
      gl.shadowMap.type    = config.shadowType;
    } else {
      gl.shadowMap.enabled = false;
    }

    // ── Camera initial position ──────────────────────────────────────────────
    camera.position.set(0, 1.1, 3.5);
    camera.fov = 42;
    camera.updateProjectionMatrix();

    // ── Fog — very subtle depth atmosphere ──────────────────────────────────
    scene.fog = new THREE.FogExp2(0x020307, 0.018);

  }, [setLodConfig]);
}

// ─────────────────────────────────────────────────────────────────────────────
// HUMANOID VIEWER — exported root component
// ─────────────────────────────────────────────────────────────────────────────

export default function HumanoidViewer({ className = "", style = {} }) {
  const [lodConfig, setLodConfig] = React.useState(LOD_CONFIG[GPU_TIERS.HIGH]);
  const onCreated                 = useGlCreated(setLodConfig);

  return (
    <div
      className={`humanoid-viewer ${className}`}
      style={{
        width:           "100%",
        height:          "100%",
        background:      "#020307",
        position:        "relative",
        overflow:        "hidden",
        ...style,
      }}
    >
      <Canvas
        // ── WebGL2 context ────────────────────────────────────────────────
        gl={{
          powerPreference:    "high-performance",
          antialias:          lodConfig.antialias,
          alpha:              false,
          stencil:            false,
          depth:              true,
          preserveDrawingBuffer: true, // needed for screenshot export (Layer 5)
        }}
        // ── DPR — adaptive based on tier ─────────────────────────────────
        dpr={lodConfig.dpr}
        // ── Camera ───────────────────────────────────────────────────────
        camera={{ fov: 42, near: 0.1, far: 100 }}
        // ── Shadows ──────────────────────────────────────────────────────
        shadows={!!lodConfig.shadowMapSize}
        // ── Performance target ────────────────────────────────────────────
        frameloop="always"
        // ── GL ready callback ────────────────────────────────────────────
        onCreated={onCreated}
      >
        <CanvasScene lodConfig={lodConfig} />
      </Canvas>
    </div>
  );
}
