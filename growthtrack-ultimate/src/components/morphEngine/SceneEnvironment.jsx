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

import React from "react";
import { Environment } from "@react-three/drei";

// ─────────────────────────────────────────────────────────────────────────────
// SCENE ENVIRONMENT
// Uses @react-three/drei's built-in "studio" preset for reliable IBL lighting.
// The custom HDRI (studio-softbox.hdr) can be added to /public/assets/hdri/
// and swapped back in once the asset is committed to the repository.
// ─────────────────────────────────────────────────────────────────────────────

export default function SceneEnvironment() {
  return (
    <Environment
      preset="studio"
      background={false}
      environmentIntensity={0.3}
      environmentRotation={[0, Math.PI * 0.25, 0]}
    />
  );
}
