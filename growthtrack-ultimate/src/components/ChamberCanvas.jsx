/**
 * ChamberCanvas.jsx — The WebGL 3D Scene for Mirror Chamber
 * Adapted from Layer 2: Render Pipeline
 */

import React, { Suspense, useCallback } from "react";
import { Canvas }                        from "@react-three/fiber";
import { Html, AdaptiveDpr, AdaptiveEvents } from "@react-three/drei";
import * as THREE                        from "three";

import StudioLighting      from "./morphEngine/StudioLighting";
import ChamberFloor        from "./morphEngine/ChamberFloor";
import SceneEnvironment    from "./morphEngine/SceneEnvironment";
import CameraRig           from "./morphEngine/CameraRig";
import PostProcessingStack from "./morphEngine/PostProcessingStack";
import { CloneEngine, BodyPartInteraction } from "./morphEngine";
import use3DStore, { GPU_TIERS }            from "../store/use3DStore";
import { detectAndSetGpuTier }              from "../store/use3DStore.usage";
import ErrorBoundary                        from "./ErrorBoundary";

const LOD_CONFIG = {
  [GPU_TIERS.HIGH]: {
    shadowMapSize:   4096,
    shadowType:      THREE.PCFSoftShadowMap,
    antialias:       true,
    dpr:             [1, 2],
    samples:         128,
    postFx:          "FULL",
    targetFps:       60,
  },
  [GPU_TIERS.MED]: {
    shadowMapSize:   2048,
    shadowType:      THREE.PCFSoftShadowMap,
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

function CanvasScene({ lodConfig }) {
  const viewMode = use3DStore((s) => s.viewMode);

  return (
    <>
      <AdaptiveDpr pixelated />
      <AdaptiveEvents />

      <Suspense fallback={null}>
        <SceneEnvironment />
      </Suspense>

      <StudioLighting lodConfig={lodConfig} />

      <Suspense fallback={null}>
        <ChamberFloor />
      </Suspense>

      <CameraRig />

      {lodConfig.postFx !== "NONE" && (
        <PostProcessingStack mode={lodConfig.postFx} />
      )}

      <Suspense fallback={null}>
        <ErrorBoundary
          fallback={
            <Html center style={{ pointerEvents: 'none' }}>
              <div style={{
                padding: '1rem 1.5rem',
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: '12px',
                color: '#f87171',
                fontFamily: "'Outfit', sans-serif",
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
        </ErrorBoundary>
      </Suspense>

    </>
  );
}

function useGlCreated(setLodConfig) {
  const initialized = React.useRef(false);

  return useCallback(({ gl, camera, scene }) => {
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
    // Shadows disabled — do not enable here.
    gl.shadowMap.enabled = false;

    camera.position.set(0, 1.1, 3.5);
    camera.fov = 42;
    camera.updateProjectionMatrix();

    scene.fog = new THREE.FogExp2(0x020307, 0.018);
  }, [setLodConfig]);
}

export default function ChamberCanvas({ className = "", style = {} }) {
  const [lodConfig, setLodConfig] = React.useState(LOD_CONFIG[GPU_TIERS.HIGH]);
  const onCreated = useGlCreated(setLodConfig);

  return (
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
      camera={{ fov: 42, near: 0.1, far: 100 }}
      shadows={false}
      frameloop="always"
      onCreated={onCreated}
      style={{ width: "100%", height: "100%", ...style }}
    >
      <CanvasScene lodConfig={lodConfig} />
    </Canvas>
  );
}
