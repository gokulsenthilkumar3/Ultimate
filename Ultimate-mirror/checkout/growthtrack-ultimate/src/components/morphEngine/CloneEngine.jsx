/**
 * GrowthTrack Ultimate — Layer 3: Parametric Morph Engine
 * CloneEngine.jsx
 *
 * Orchestrates the rendering of CloneA ("YOU NOW") and CloneB ("YOUR GOAL")
 * across all 6 view modes from the store.
 *
 * VIEW MODE BEHAVIOURS:
 *
 *  SOLO        — Single model, full viewport. Toggle A ↔ B via store.
 *  DUAL        — Side-by-side: A at [-0.9,0,0], B at [0.9,0,0].
 *                Floating delta labels between them (CSS/HTML overlay).
 *  GHOST       — Both at [0,0,0]. A opaque, B translucent cyan (opacity 0.3).
 *  SPLIT       — Both at [0,0,0]. StencilSplit component masks each half.
 *  DELTA       — Single model (A) with growth/loss shader (Layer 4 material).
 *  TIMELINE    — Single model showing getScrubbedMorphState() — past snapshots.
 *
 * Measurement delta labels (DUAL mode) and split divider (SPLIT mode)
 * are rendered as HTML overlays via <Html> from @react-three/drei,
 * keeping them perfectly in sync with the 3D scene.
 *
 * This component mounts inside CanvasScene in HumanoidViewer.jsx (Layer 2).
 */

import React, { useMemo, useEffect, useRef } from "react";
import { Html }                               from "@react-three/drei";
import { useFrame, useThree }                 from "@react-three/fiber";
import * as THREE                             from "three";

import HumanoidClone from "./HumanoidClone";
import use3DStore, { VIEW_MODES } from "../../store/use3DStore";
import SplitStencilScene from "./SplitStencilPass";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** X-axis separation between clones in DUAL mode (world units) */
const DUAL_SEPARATION = 0.9;

/** Measurements shown as floating labels in DUAL mode */
const DELTA_LABEL_MEASUREMENTS = [
  "weight", "chest", "waist", "shoulders", "arms", "thighs", "bodyFat",
];

const MEASUREMENT_UNITS = {
  weight:    "kg",
  chest:     "cm",
  waist:     "cm",
  shoulders: "cm",
  arms:      "cm",
  thighs:    "cm",
  bodyFat:   "%",
  calves:    "cm",
  neck:      "cm",
};

// ─────────────────────────────────────────────────────────────────────────────
// DELTA LABELS — floating HTML overlays in DUAL mode
// ─────────────────────────────────────────────────────────────────────────────

const LABEL_Y_POSITIONS = {
  weight:    1.85,
  bodyFat:   1.65,
  chest:     1.35,
  shoulders: 1.5,
  arms:      1.1,
  waist:     0.95,
  thighs:    0.6,
};

function DeltaLabel({ measurement, delta, yPosition }) {
  const unit     = MEASUREMENT_UNITS[measurement] ?? "";
  const isGain   = delta > 0;
  const isLoss   = delta < 0;
  const sign     = isGain ? "+" : "";
  const color    = isGain ? "#10B981" : isLoss ? "#F43F5E" : "#888";
  const label    = measurement.charAt(0).toUpperCase() + measurement.slice(1);

  return (
    <Html
      position={[0, yPosition, 0.2]}
      center
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div
        style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          gap:            "2px",
          fontFamily:     "'Outfit', sans-serif",
          color,
          filter:         `drop-shadow(0 0 6px ${color}88)`,
          whiteSpace:     "nowrap",
        }}
      >
        <span style={{ fontSize: "11px", opacity: 0.7, letterSpacing: "0.1em" }}>
          {label}
        </span>
        <span style={{ fontSize: "15px", fontWeight: 700, letterSpacing: "-0.02em" }}>
          {sign}{delta.toFixed(1)}{unit}
        </span>
      </div>
    </Html>
  );
}

function DualDeltaLabels({ deltas }) {
  if (!deltas) return null;

  return (
    <>
      {DELTA_LABEL_MEASUREMENTS.map((key) => {
        const delta = deltas[key];
        if (delta === null || delta === undefined || Math.abs(delta) < 0.5) return null;
        return (
          <DeltaLabel
            key={key}
            measurement={key}
            delta={delta}
            yPosition={LABEL_Y_POSITIONS[key] ?? 1.0}
          />
        );
      })}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SPLIT DIVIDER — vertical stencil line for SPLIT mode
// Rendered as a 3D plane with a glowing cyan material.
// Actual per-pixel masking requires a custom shader (Layer 4 can extend this).
// This version uses two render groups side-by-side as a simpler approach.
// ─────────────────────────────────────────────────────────────────────────────

function SplitDivider({ dividerX }) {
  // dividerX is 0–1 (fraction of viewport). Convert to world space.
  // The models span roughly from -1 to 1 on the X axis.
  const worldX = (dividerX - 0.5) * 2.0;

  return (
    <mesh position={[worldX, 1.0, 0.05]}>
      <planeGeometry args={[0.006, 2.2]} />
      <meshBasicMaterial
        color="#22D3EE"
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE CLONE — reads scrubbed morph state from store
// Uses a special HumanoidClone with injected weights instead of store slice.
// ─────────────────────────────────────────────────────────────────────────────

function TimelineClone() {
  // We use cloneA geometry but override weights with timeline scrub output.
  // The scrubbed state is pushed into a temporary store override.
  // Simplest approach: use cloneA and sync scrubbed weights in useFrame.
  const getScrubbedMorphState = use3DStore.getState().getScrubbedMorphState;

  useEffect(() => {
    // Subscribe to timeline scrub changes and push into cloneA weights
    return use3DStore.subscribe(
      (s) => s.timelineScrubIndex,
      () => {
        const scrubbedState = use3DStore.getState().getScrubbedMorphState();
        use3DStore.getState().setCurrentMetrics(scrubbedState.metrics);
      }
    );
  }, []);

  return (
    <HumanoidClone
      cloneKey="A"
      position={[0, 0, 0]}
      opacity={1}
      snapWeights={false}
      renderMode="normal"
      visible={true}
      showAura={false}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLONE ENGINE — main export
// ─────────────────────────────────────────────────────────────────────────────

export default function CloneEngine() {
  const viewMode      = use3DStore((s) => s.viewMode);
  const splitDividerX = use3DStore((s) => s.splitDividerX);
  const getDeltas     = use3DStore((s) => s.getDeltas);

  const deltas = useMemo(() => getDeltas(), [getDeltas, viewMode]);

  switch (viewMode) {

    // ── SOLO MODE ────────────────────────────────────────────────────────────
    case VIEW_MODES.SOLO:
      return (
        <HumanoidClone
          cloneKey="A"
          position={[0, 0, 0]}
          renderMode="normal"
          visible={true}
        />
      );

    // ── DUAL MODE ────────────────────────────────────────────────────────────
    case VIEW_MODES.DUAL:
      return (
        <>
          {/* YOU NOW — left */}
          <HumanoidClone
            cloneKey="A"
            position={[-DUAL_SEPARATION, 0, 0]}
            renderMode="normal"
            visible={true}
          />

          {/* YOUR GOAL — right, instant weights */}
          <HumanoidClone
            cloneKey="B"
            position={[DUAL_SEPARATION, 0, 0]}
            snapWeights={true}
            renderMode="normal"
            visible={true}
            showAura={true}
          />

          {/* Floating delta labels between the two clones */}
          <DualDeltaLabels deltas={deltas} />

          {/* "YOU NOW" label */}
          <Html position={[-DUAL_SEPARATION, -0.1, 0]} center style={{ pointerEvents: "none" }}>
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              color: "#4FC3F7",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              filter: "drop-shadow(0 0 8px #4FC3F788)",
            }}>
              YOU NOW
            </div>
          </Html>

          {/* "YOUR GOAL" label */}
          <Html position={[DUAL_SEPARATION, -0.1, 0]} center style={{ pointerEvents: "none" }}>
            <div style={{
              fontFamily: "'Outfit', sans-serif",
              color: "#22D3EE",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              filter: "drop-shadow(0 0 8px #22D3EE88)",
            }}>
              YOUR GOAL
            </div>
          </Html>
        </>
      );

    // ── GHOST MODE ────────────────────────────────────────────────────────────
    case VIEW_MODES.GHOST:
      return (
        <>
          {/* YOU NOW — opaque, rendered first (no transparency issues) */}
          <HumanoidClone
            cloneKey="A"
            position={[0, 0, 0]}
            renderMode="normal"
            opacity={1}
            visible={true}
          />

          {/* YOUR GOAL — translucent cyan ghost, rendered on top */}
          <HumanoidClone
            cloneKey="B"
            position={[0, 0, 0]}
            renderMode="ghost"
            opacity={0.3}
            snapWeights={true}
            visible={true}
          />
        </>
      );

    // ── SPLIT MODE ────────────────────────────────────────────────────────────
    case VIEW_MODES.SPLIT:
      return <SplitStencilScene dividerX={splitDividerX} />;

    // ── DELTA MODE ────────────────────────────────────────────────────────────
    // Single model with growth/loss regions.
    // The DeltaHeatmapShader (Layer 4) takes over the material.
    case VIEW_MODES.DELTA:
      return (
        <HumanoidClone
          cloneKey="A"
          position={[0, 0, 0]}
          renderMode="delta"
          visible={true}
        />
      );

    // ── TIMELINE MODE ─────────────────────────────────────────────────────────
    case VIEW_MODES.TIMELINE:
      return <TimelineClone />;

    default:
      return null;
  }
}
