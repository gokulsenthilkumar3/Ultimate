/**
 * GrowthTrack Ultimate — Layer 2: Render Pipeline
 * PostProcessingStack.jsx
 *
 * EffectComposer pipeline stub — wired into HumanoidViewer.jsx.
 * Full shader passes are implemented in Layer 4.
 *
 * This file defines the pass ORDER and LOD branching.
 * Layer 4 will flesh out the custom GLSL passes (SSS, vascularity, delta, aura).
 *
 * Pass order from architecture doc:
 *   Pass 1: RenderPass          ← base scene (handled by R3F automatically)
 *   Pass 2: SSAOPass            ← ambient occlusion
 *   Pass 3: BloomPass           ← glow on aura/goal edges (threshold 0.85)
 *   Pass 4: ChromaticAberration ← subtle (0.0005) on transitions
 *   Pass 5: VignettePass        ← dark edges
 *   Pass 6: ToneMappingPass     ← ACES cinematic grade
 *   Pass 7: GlitchPass          ← fires 1 frame on mode transitions
 *
 * Mode:
 *   "FULL"    → all 7 passes (HIGH GPU tier)
 *   "PARTIAL" → Bloom + Vignette only (MED GPU tier)
 *   "NONE"    → no EffectComposer (LOW GPU tier — HumanoidViewer skips this)
 *
 * Deps: @react-three/postprocessing
 */

import React, { useRef, useEffect } from "react";
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
  ToneMapping,
  SSAO,
  Glitch,
} from "@react-three/postprocessing";
import {
  BlendFunction,
  GlitchMode,
  ToneMappingMode,
} from "postprocessing";
import * as THREE from "three";

import use3DStore from "../../store/use3DStore";

// ─────────────────────────────────────────────────────────────────────────────
// GLITCH TRIGGER — fires for exactly 1 frame on viewMode change
// ─────────────────────────────────────────────────────────────────────────────

function useGlitchTrigger() {
  const glitchRef = useRef();
  const prevMode  = useRef(null);

  useEffect(() => {
    return use3DStore.subscribe(
      (s) => s.viewMode,
      (mode) => {
        if (prevMode.current !== null && glitchRef.current) {
          // Activate glitch for one short burst (~80ms)
          glitchRef.current.mode = GlitchMode.SPORADIC;
          setTimeout(() => {
            if (glitchRef.current) glitchRef.current.mode = GlitchMode.DISABLED;
          }, 80);
        }
        prevMode.current = mode;
      }
    );
  }, []);

  return glitchRef;
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL STACK — HIGH tier
// ─────────────────────────────────────────────────────────────────────────────

function FullPostProcessing() {
  const glitchRef = useGlitchTrigger();

  return (
    <EffectComposer multisampling={4} /* MSAA 4x */ >

      {/* Pass 2 — SSAO: pore depth + crease shadows */}
      <SSAO
        blendFunction={BlendFunction.MULTIPLY}
        samples={16}
        radius={0.05}
        intensity={8}
        luminanceInfluence={0.6}
        color={new THREE.Color("black")}
      />

      {/* Pass 3 — Bloom: aura/goal model edges */}
      <Bloom
        luminanceThreshold={0.85}
        luminanceSmoothing={0.025}
        intensity={0.6}
        mipmapBlur
        radius={0.7}
      />

      {/* Pass 4 — Chromatic Aberration: subtle, fires on transitions */}
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={new THREE.Vector2(0.0005, 0.0005)}
        radialModulation={false}
      />

      {/* Pass 5 — Vignette: focus attention on models */}
      <Vignette
        blendFunction={BlendFunction.NORMAL}
        eskil={false}
        offset={0.3}
        darkness={0.85}
      />

      {/* Pass 6 — Tone Mapping: ACES cinematic grade */}
      <ToneMapping
        blendFunction={BlendFunction.NORMAL}
        mode={ToneMappingMode.ACES_FILMIC}
        resolution={256}
        whitePoint={4.0}
        middleGrey={0.6}
        minLuminance={0.01}
        averageLuminance={1.0}
        adaptationRate={1.0}
      />

      {/* Pass 7 — Glitch: 1-frame cinematic cut on mode switch */}
      <Glitch
        ref={glitchRef}
        delay={new THREE.Vector2(0, 0)}
        duration={new THREE.Vector2(0.08, 0.08)}
        strength={new THREE.Vector2(0.15, 0.25)}
        mode={GlitchMode.DISABLED} // starts disabled; triggered by useGlitchTrigger
        active={true}
        ratio={0.85}
      />
    </EffectComposer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTIAL STACK — MED tier (Bloom + Vignette only)
// ─────────────────────────────────────────────────────────────────────────────

function PartialPostProcessing() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        luminanceThreshold={0.85}
        luminanceSmoothing={0.025}
        intensity={0.5}
        mipmapBlur
        radius={0.7}
      />
      <Vignette
        blendFunction={BlendFunction.NORMAL}
        eskil={false}
        offset={0.3}
        darkness={0.8}
      />
    </EffectComposer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST PROCESSING STACK — exported (called by HumanoidViewer)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ mode: "FULL" | "PARTIAL" }} props
 */
export default function PostProcessingStack({ mode }) {
  if (mode === "FULL")    return <FullPostProcessing />;
  if (mode === "PARTIAL") return <PartialPostProcessing />;
  return null;
}
