/**
 * ChamberCanvas.jsx — The WebGL 3D Scene for Mirror Chamber
 * Adapted from Layer 2: Render Pipeline
 */

import React, { Suspense, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Stats, AdaptiveDpr, AdaptiveEvents, Preload } from "@react-three/drei";
import * as THREE from "three";

import StudioLighting      from "./morphEngine/StudioLighting";
import ChamberFloor        from "./morphEngine/ChamberFloor";
import SceneEnvironment    from "./morphEngine/SceneEnvironment";
import CameraRig           from "./morphEngine/CameraRig";
import PostProcessingStack from "./morphEngine/PostProcessingStack";

import { CloneEngine, BodyPartInteraction } from "./morphEngine";
import use3DStore, { GPU_TIERS } from "../store/use3DStore";
import { detectAndSetGpuTier } from "../store/use3DStore.usage";

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
        <CloneEngine />
        
        {(viewMode === 'SOLO' || viewMode === 'DUAL') && (
          <BodyPartInteraction clonePosition={[0, 0, 0]} />
        )}
      </Suspense>

      {process.env.NODE_ENV === "development" && <Stats />}
      <Preload all />
    </>
  );
}

function useGlCreated(setLodConfig) {
  return useCallback(({ gl, camera, scene }) => {
    detectAndSetGpuTier(gl);
    const tier   = use3DStore.getState().gpuTier || GPU_TIERS.HIGH;
    const config = LOD_CONFIG[tier];
    setLodConfig(config);

    gl.toneMapping         = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.15;
    gl.outputColorSpace    = THREE.SRGBColorSpace;

    if (config.shadowMapSize) {
      gl.shadowMap.enabled = true;
      gl.shadowMap.type    = config.shadowType;
    } else {
      gl.shadowMap.enabled = false;
    }

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
        powerPreference:    "high-performance",
        antialias:          lodConfig.antialias,
        alpha:              false,
        stencil:            false,
        depth:              true,
        preserveDrawingBuffer: true,
      }}
      dpr={lodConfig.dpr}
      camera={{ fov: 42, near: 0.1, far: 100 }}
      shadows={!!lodConfig.shadowMapSize}
      frameloop="always"
      onCreated={onCreated}
      style={{ width: "100%", height: "100%", ...style }}
    >
      <CanvasScene lodConfig={lodConfig} />
    </Canvas>
  );
}
