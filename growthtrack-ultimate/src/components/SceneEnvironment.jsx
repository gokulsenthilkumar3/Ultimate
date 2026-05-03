/**
 * GrowthTrack Ultimate — Layer 2: Render Pipeline
 * SceneEnvironment.jsx
 *
 * Environment map setup for the Mirror Chamber.
 * Spec: HDRI "Studio Softbox" — warm skin tones, soft wrap-around light.
 *
 * Strategy:
 *  - In PROD: load a custom baked HDR file from /assets/hdri/studio-softbox.hdr
 *  - In DEV / fallback: use @react-three/drei's built-in "studio" preset
 *    which is close enough for development and avoids a large asset dep.
 *
 * The environment is used for:
 *  1. IBL (image-based lighting) on PBR skin/cloth materials
 *  2. Reflections in MeshReflectorMaterial (floor)
 *  3. Background (set to invisible — solid #020307 bg is CSS)
 *
 * Deps: @react-three/drei
 */

import React        from "react";
import { Environment, useEnvironment } from "@react-three/drei";

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM HDRI LOADER (production path)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads the custom baked studio softbox HDRI.
 * Swap HDRI_PATH to your actual asset once baked.
 * The file should live at: /public/assets/hdri/studio-softbox.hdr
 */
const HDRI_PATH = "/assets/hdri/studio-softbox.hdr";

function CustomHdriEnvironment() {
  // useEnvironment handles caching + suspension
  const envMap = useEnvironment({ files: HDRI_PATH });

  return (
    <Environment
      map={envMap}
      background={false}          // keep background pure #020307
      backgroundBlurriness={0}
      environmentIntensity={0.35} // subtle IBL — studio lights do the heavy lifting
      environmentRotation={[0, Math.PI * 0.25, 0]} // slight rotation for interesting specular hits
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK ENVIRONMENT (dev / no-asset mode)
// Uses drei preset which is a decent studio approximation
// ─────────────────────────────────────────────────────────────────────────────

function FallbackEnvironment() {
  return (
    <Environment
      preset="studio"
      background={false}
      environmentIntensity={0.3}
      environmentRotation={[0, Math.PI * 0.25, 0]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE ENVIRONMENT — exported component
// Tries custom HDRI first; falls back to preset on error.
// ─────────────────────────────────────────────────────────────────────────────

export default function SceneEnvironment() {
  const useCustomHdri = process.env.NODE_ENV === "production";

  if (useCustomHdri) {
    return (
      <React.Suspense fallback={<FallbackEnvironment />}>
        <CustomHdriEnvironment />
      </React.Suspense>
    );
  }

  return <FallbackEnvironment />;
}
