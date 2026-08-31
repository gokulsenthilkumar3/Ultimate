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

import React, { useMemo, useRef } from "react";
import { Html }                               from "@react-three/drei";
import { useFrame, useThree }                 from "@react-three/fiber";
import * as THREE                             from "three";

import HumanoidClone from "./HumanoidClone";
import BodyPartInteraction from "./BodyPartInteraction";
import use3DStore, { VIEW_MODES } from "../../store/use3DStore";
import SplitStencilScene from "./SplitStencilPass";
import { getDualSeparation } from "./sceneLayout";
import { buildMorphWeights } from "./metricsToBlendshapes";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

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

function DualDeltaLabels({ deltas }) {
  if (!deltas) return null;
  const visibleDeltas = DELTA_LABEL_MEASUREMENTS
    .map((measurement) => ({ measurement, delta: deltas[measurement] }))
    .filter(({ delta }) => Number.isFinite(delta) && Math.abs(delta) >= 0.5)
    .slice(0, 4);
  if (!visibleDeltas.length) return null;

  return (
    <Html position={[0, 1.16, 0.34]} center style={{ pointerEvents: "none", userSelect: "none" }}>
      <div className="chamber-delta-summary">
        <span className="chamber-delta-summary__eyebrow">GOAL CHANGE</span>
        {visibleDeltas.map(({ measurement, delta }) => {
          const unit = MEASUREMENT_UNITS[measurement] ?? "";
          const label = measurement === 'bodyFat'
            ? 'Body fat'
            : measurement.charAt(0).toUpperCase() + measurement.slice(1);
          return (
            <div key={measurement} className="chamber-delta-summary__row">
              <span>{label}</span>
              <strong className={delta > 0 ? 'positive' : 'negative'}>
                {delta > 0 ? '+' : ''}{delta.toFixed(1)}{unit}
              </strong>
            </div>
          );
        })}
      </div>
    </Html>
  );
}

function DualFigure({ cloneKey, side, separation, goal = false }) {
  const groupRef = useRef(null);
  const cameraRight = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera }) => {
    if (!groupRef.current) return;
    cameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize().multiplyScalar(side * separation);
    groupRef.current.position.copy(cameraRight);
    groupRef.current.position.y = 0;
  });

  return (
    <group ref={groupRef} position={[side * separation, 0, 0]} name={`dual-figure-${cloneKey}`}>
      <HumanoidClone
        cloneKey={cloneKey}
        position={[0, 0, 0]}
        snapWeights={goal}
        renderMode="normal"
        visible
        showAura={goal}
      />
      {!goal && <BodyPartInteraction cloneKey={cloneKey} clonePosition={[0, 0, 0]} />}
      <Html position={[0, 0.08, 0.24]} center style={{ pointerEvents: "none" }}>
        <div className={`chamber-clone-label${goal ? ' chamber-clone-label--goal' : ''}`}>
          {goal ? 'YOUR GOAL' : 'YOU NOW'}
        </div>
      </Html>
    </group>
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
  // Read scrubbed state from store on each timeline scrub change
  // WITHOUT permanently mutating cloneA — we pass scrubbedMetrics as local state
  const scrubIndex = use3DStore((s) => s.timelineScrubIndex);
  const snapshots  = use3DStore((s) => s.timelineSnaps);
  const currentOverrides = use3DStore((s) => s.morphOverrides.current);

  // Compute scrubbed metrics locally (no store mutation)
  const scrubbedMetrics = useMemo(() => {
    if (scrubIndex === null || !snapshots.length) return null;
    const i     = Math.floor(scrubIndex);
    const t     = scrubIndex - i;
    const snapA = snapshots[Math.min(i, snapshots.length - 1)];
    const snapB = snapshots[Math.min(i + 1, snapshots.length - 1)];
    if (!snapA) return null;
    if (!snapB || t === 0) return snapA.metrics;
    return Object.fromEntries(
      Object.keys(snapA.metrics).map((key) => {
        const a = snapA.metrics[key];
        const b = snapB.metrics[key];
        return typeof a === 'number' ? [key, a + (b - a) * t] : [key, a];
      })
    );
  }, [scrubIndex, snapshots]);

  // Timeline is a read-only render projection. Older code temporarily wrote
  // snapshots into cloneA and restored them on unmount, which could overwrite
  // a real measurement edited while the scrubber was open.
  const scrubbedWeights = useMemo(
    () => (scrubbedMetrics ? buildMorphWeights(scrubbedMetrics, currentOverrides) : null),
    [currentOverrides, scrubbedMetrics],
  );

  return (
    <HumanoidClone
      cloneKey="A"
      position={[0, 0, 0]}
      opacity={1}
      snapWeights={false}
      renderMode="normal"
      visible={true}
      showAura={false}
      metricsOverride={scrubbedMetrics}
      weightsOverride={scrubbedWeights}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLONE ENGINE — main export
// ─────────────────────────────────────────────────────────────────────────────

export default function CloneEngine() {
  const canvasWidth = useThree((state) => state.size.width);
  const dualSeparation = getDualSeparation(canvasWidth);
  const viewMode      = use3DStore((s) => s.viewMode);
  const splitDividerX = use3DStore((s) => s.splitDividerX);
  // Live delta subscription — updates on every metric change, not just viewMode
  const cloneAMetrics = use3DStore((s) => s.cloneA.metrics);
  const cloneBMetrics = use3DStore((s) => s.cloneB.metrics);
  const deltas = useMemo(() => {
    const d = {};
    for (const key of Object.keys(cloneAMetrics)) {
      if (typeof cloneAMetrics[key] === 'number') {
        d[key] = (cloneBMetrics[key] ?? cloneAMetrics[key]) - cloneAMetrics[key];
      }
    }
    return d;
  }, [cloneAMetrics, cloneBMetrics]);

  switch (viewMode) {

    // ── SOLO MODE ────────────────────────────────────────────────────────────
    case VIEW_MODES.SOLO:
      return (
        <>
          <HumanoidClone
            cloneKey="A"
            position={[0, 0, 0]}
            renderMode="normal"
            visible={true}
          />
          <BodyPartInteraction cloneKey="A" clonePosition={[0, 0, 0]} />
        </>
      );

    // ── DUAL MODE ────────────────────────────────────────────────────────────
    case VIEW_MODES.DUAL:
      return (
        <>
          <DualFigure cloneKey="A" side={-1} separation={dualSeparation} />
          <DualFigure cloneKey="B" side={1} separation={dualSeparation} goal />

          {/* Floating delta labels between the two clones */}
          <DualDeltaLabels deltas={deltas} />

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
