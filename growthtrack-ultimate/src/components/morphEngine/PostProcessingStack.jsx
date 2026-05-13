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

import React, { useRef, useEffect, Suspense } from "react";
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
  ToneMapping,
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

function useGlitchTrigger(glitchRef) {
  const prevMode = useRef(null);

  useEffect(() => {
    return use3DStore.subscribe(
      (s) => s.viewMode,
      (mode) => {
        if (prevMode.current !== null && glitchRef.current) {
          // Access the underlying effect object safely
          const effect = glitchRef.current;
          if (effect && typeof effect === 'object') {
            try {
              effect.mode = GlitchMode.SPORADIC;
              setTimeout(() => {
                if (effect) effect.mode = GlitchMode.DISABLED;
              }, 80);
            } catch { /* ignore if API changed */ }
          }
        }
        prevMode.current = mode;
      }
    );
  }, [glitchRef]);
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL STACK — HIGH tier
// ─────────────────────────────────────────────────────────────────────────────

function FullPostProcessing() {
  const glitchRef = useRef();
  useGlitchTrigger(glitchRef);

  return (
    <Suspense fallback={null}>
      <EffectComposer multisampling={4}>

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

        {/* Pass 6 — Tone Mapping: Safe linear grade to prevent crash in three.js 0.184 */}
        <ToneMapping
          blendFunction={BlendFunction.NORMAL}
          mode={ToneMappingMode.LINEAR}
        />

        {/* Pass 7 — Glitch: 1-frame cinematic cut on mode switch */}
        <Glitch
          ref={glitchRef}
          delay={new THREE.Vector2(0, 0)}
          duration={new THREE.Vector2(0.08, 0.08)}
          strength={new THREE.Vector2(0.15, 0.25)}
          mode={GlitchMode.DISABLED}
          active
          ratio={0.85}
        />
      </EffectComposer>
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTIAL STACK — MED tier (Bloom + Vignette only)
// ─────────────────────────────────────────────────────────────────────────────

function PartialPostProcessing() {
  return (
    <Suspense fallback={null}>
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
    </Suspense>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST PROCESSING STACK — exported (called by HumanoidViewer)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {{ mode: "FULL" | "PARTIAL" }} props
 */
/**
 * @param {{ mode: "FULL" | "PARTIAL" }} props
 *
 * NOTE: @react-three/postprocessing v3 changed how EffectComposer collects
 * children effects — it internally calls `.length` on an undefined list,
 * crashing the canvas. Disabled until the v3 API migration is complete.
 * The scene renders correctly without post-processing.
 */
export default function PostProcessingStack({ mode }) {
  // eslint-disable-next-line no-unused-vars
  void mode;
  return null;
}
