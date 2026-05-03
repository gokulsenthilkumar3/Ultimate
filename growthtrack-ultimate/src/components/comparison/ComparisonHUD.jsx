/**
 * GrowthTrack Ultimate — Layer 6: Comparison & Clone Engine
 * ComparisonHUD.jsx
 *
 * Floating 3D measurement delta cards rendered in DUAL mode.
 * Mounted inside the R3F canvas via <Html> from @react-three/drei.
 *
 * Features:
 *   - Per-measurement delta cards between the two clones
 *   - Cards face camera (billboard) via <Html center>
 *   - Gain cards: green + upward arrow + glow
 *   - Loss cards: red-pink + downward arrow + glow (for fat loss: celebrated as positive)
 *   - Neutral cards (< threshold): hidden
 *   - Entry animation: cards slide in on viewMode change
 *   - Cards show: measurement name / current value / goal value / delta
 *   - "GOAL BY DEC 2026" badge on goal clone nameplate
 *   - Progress ring showing overall completion %
 *
 * Card World Positions:
 *   Cards are staggered vertically between the two clones (x=0)
 *   and slightly forward (z=0.25) so they float between the models.
 */

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Html }                                          from "@react-three/drei";
import { useShallow }                                    from "zustand/react/shallow";
import use3DStore                                        from "../store/use3DStore";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const CARD_SPACING    = 0.185;  // vertical spacing between cards (world units)
const CARD_OFFSET_Y   = 1.8;    // Y position of topmost card
const CARD_Z          = 0.28;   // forward offset from model plane

/** Measurements to show cards for, in display order (top to bottom) */
const CARD_MEASUREMENTS = [
  { key: "weight",    label: "Weight",    unit: "kg",  isLossPositive: false },
  { key: "bodyFat",   label: "Body Fat",  unit: "%",   isLossPositive: true  }, // losing fat = good
  { key: "chest",     label: "Chest",     unit: "cm",  isLossPositive: false },
  { key: "shoulders", label: "Shoulders", unit: "cm",  isLossPositive: false },
  { key: "waist",     label: "Waist",     unit: "cm",  isLossPositive: true  }, // losing waist = good
  { key: "arms",      label: "Arms",      unit: "cm",  isLossPositive: false },
  { key: "thighs",    label: "Thighs",    unit: "cm",  isLossPositive: false },
  { key: "calves",    label: "Calves",    unit: "cm",  isLossPositive: false },
];

/** Delta threshold: below this value the card is hidden (noise suppression) */
const DELTA_THRESHOLD = 0.8;

/** Stagger delay per card for entry animation (ms) */
const ENTRY_STAGGER = 55;

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE DELTA CARD
// ─────────────────────────────────────────────────────────────────────────────

function DeltaCard({ measurement, currentVal, goalVal, delta, yPosition, entryDelay }) {
  const [visible, setVisible] = useState(false);

  // Staggered entry animation
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), entryDelay);
    return () => clearTimeout(t);
  }, [entryDelay]);

  const absD          = Math.abs(delta);
  const isGain        = measurement.isLossPositive ? delta < 0 : delta > 0;
  const isNeutral     = absD < DELTA_THRESHOLD;

  if (isNeutral) return null;

  const accentColor   = isGain ? "#10B981" : "#F43F5E";
  const glowColor     = isGain ? "#10B98140" : "#F43F5E40";
  const arrowSymbol   = isGain ? "▲" : "▼";
  const sign          = delta > 0 ? "+" : "";

  return (
    <Html
      position={[0, yPosition, CARD_Z]}
      center
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div style={{
        display:         "flex",
        flexDirection:   "column",
        alignItems:      "center",
        gap:             "3px",
        opacity:         visible ? 1 : 0,
        transform:       visible ? "translateY(0px) scale(1)" : "translateY(8px) scale(0.92)",
        transition:      "opacity 0.35s ease, transform 0.35s cubic-bezier(0.16,1,0.3,1)",
        fontFamily:      "'Outfit', 'Inter', sans-serif",
        whiteSpace:      "nowrap",
      }}>
        {/* Card body */}
        <div style={{
          background:    "rgba(2, 3, 7, 0.82)",
          border:        `1px solid ${accentColor}44`,
          borderRadius:  "8px",
          padding:       "6px 12px",
          backdropFilter:"blur(8px)",
          boxShadow:     `0 0 14px ${glowColor}, inset 0 1px 0 ${accentColor}22`,
          display:       "flex",
          flexDirection: "column",
          alignItems:    "center",
          gap:           "1px",
          minWidth:      "90px",
        }}>
          {/* Measurement label */}
          <span style={{
            fontSize:    "9px",
            color:       "#8899AA",
            fontWeight:  600,
            letterSpacing:"0.12em",
            textTransform:"uppercase",
          }}>
            {measurement.label}
          </span>

          {/* Delta value */}
          <span style={{
            fontSize:    "16px",
            fontWeight:  800,
            color:       accentColor,
            letterSpacing:"-0.02em",
            lineHeight:  "1",
            filter:      `drop-shadow(0 0 6px ${accentColor})`,
          }}>
            {arrowSymbol} {sign}{absD.toFixed(1)}{measurement.unit}
          </span>

          {/* Current → Goal */}
          <div style={{
            display:     "flex",
            gap:         "5px",
            alignItems:  "center",
            fontSize:    "9px",
            color:       "#667788",
          }}>
            <span>{currentVal.toFixed(1)}</span>
            <span style={{ color: "#334455" }}>→</span>
            <span style={{ color: "#22D3EE" }}>{goalVal.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </Html>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CLONE NAMEPLATE
// ─────────────────────────────────────────────────────────────────────────────

function CloneNameplate({ label, sublabel, x, color, progressPercent }) {
  return (
    <Html position={[x, -0.18, 0.1]} center style={{ pointerEvents: "none" }}>
      <div style={{
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
        gap:           "4px",
        fontFamily:    "'Outfit', sans-serif",
      }}>
        <span style={{
          fontSize:    "11px",
          fontWeight:  700,
          letterSpacing:"0.18em",
          color,
          filter:      `drop-shadow(0 0 10px ${color}99)`,
          textTransform:"uppercase",
        }}>
          {label}
        </span>
        {sublabel && (
          <span style={{
            fontSize:    "9px",
            color:       "#445566",
            letterSpacing:"0.08em",
          }}>
            {sublabel}
          </span>
        )}
        {progressPercent !== undefined && (
          <div style={{
            width:        "60px",
            height:       "3px",
            background:   "#0D1520",
            borderRadius: "2px",
            overflow:     "hidden",
          }}>
            <div style={{
              width:       `${progressPercent}%`,
              height:      "100%",
              background:  `linear-gradient(90deg, ${color}88, ${color})`,
              borderRadius:"2px",
              transition:  "width 0.6s cubic-bezier(0.16,1,0.3,1)",
            }} />
          </div>
        )}
      </div>
    </Html>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERALL PROGRESS BADGE — floats at top centre between clones
// ─────────────────────────────────────────────────────────────────────────────

function OverallProgressBadge({ percent }) {
  return (
    <Html position={[0, 2.35, 0.3]} center style={{ pointerEvents: "none" }}>
      <div style={{
        background:    "rgba(2, 3, 7, 0.90)",
        border:        "1px solid #22D3EE33",
        borderRadius:  "24px",
        padding:       "5px 16px",
        backdropFilter:"blur(10px)",
        boxShadow:     "0 0 20px #22D3EE22",
        fontFamily:    "'Outfit', sans-serif",
        display:       "flex",
        alignItems:    "center",
        gap:           "10px",
        whiteSpace:    "nowrap",
      }}>
        {/* Circular progress ring */}
        <svg width="28" height="28" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="14" cy="14" r="11" fill="none" stroke="#0D1520" strokeWidth="2.5" />
          <circle
            cx="14" cy="14" r="11"
            fill="none"
            stroke="#22D3EE"
            strokeWidth="2.5"
            strokeDasharray={`${2 * Math.PI * 11}`}
            strokeDashoffset={`${2 * Math.PI * 11 * (1 - percent / 100)}`}
            strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 4px #22D3EE)" }}
          />
        </svg>

        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          <span style={{
            fontSize:    "13px",
            fontWeight:  800,
            color:       "#22D3EE",
            letterSpacing:"-0.02em",
          }}>
            {percent}%
          </span>
          <span style={{
            fontSize:    "8px",
            color:       "#445566",
            letterSpacing:"0.12em",
            textTransform:"uppercase",
          }}>
            to goal
          </span>
        </div>
      </div>
    </Html>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPARISON HUD — main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mount this inside CloneEngine's DUAL case, as a sibling of the two clones.
 * Reads store directly — no props needed.
 *
 * @param {{ cloneASeparation: number }} props
 *   cloneASeparation — the DUAL_SEPARATION constant from CloneEngine (default 0.9)
 */
export default function ComparisonHUD({ cloneASeparation = 0.9 }) {
  const [entryKey, setEntryKey] = useState(0);

  const { currentMetrics, goalMetrics, getDeltas, getProgressPercent, ambitionPath } =
    use3DStore(useShallow((s) => ({
      currentMetrics:   s.cloneA.metrics,
      goalMetrics:      s.cloneB.metrics,
      getDeltas:        s.getDeltas,
      getProgressPercent: s.getProgressPercent,
      ambitionPath:     s.ambitionPath,
    })));

  const deltas  = useMemo(() => getDeltas(),  [getDeltas, currentMetrics, goalMetrics]);
  const percent = useMemo(() => getProgressPercent(), [getProgressPercent]);

  // Re-trigger entry animation when metrics change significantly
  const prevWeight = useRef(currentMetrics.weight);
  useEffect(() => {
    if (Math.abs(currentMetrics.weight - prevWeight.current) > 0.5) {
      setEntryKey((k) => k + 1);
      prevWeight.current = currentMetrics.weight;
    }
  }, [currentMetrics.weight]);

  // Deadline label
  const deadline = ambitionPath?.deadline
    ? new Date(ambitionPath.deadline).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "Dec 2026";

  return (
    <>
      {/* ── Overall progress badge ── */}
      <OverallProgressBadge percent={percent} />

      {/* ── Delta cards (centre between clones) ── */}
      {CARD_MEASUREMENTS.map((m, i) => {
        const delta      = deltas[m.key] ?? 0;
        const currentVal = currentMetrics[m.key] ?? 0;
        const goalVal    = goalMetrics[m.key]    ?? 0;

        return (
          <DeltaCard
            key={`${m.key}-${entryKey}`}
            measurement={m}
            currentVal={currentVal}
            goalVal={goalVal}
            delta={delta}
            yPosition={CARD_OFFSET_Y - i * CARD_SPACING}
            entryDelay={i * ENTRY_STAGGER}
          />
        );
      })}

      {/* ── Nameplates ── */}
      <CloneNameplate
        label="You Now"
        sublabel={`${currentMetrics.weight}kg · ${currentMetrics.bodyFat}% BF`}
        x={-cloneASeparation}
        color="#4FC3F7"
      />
      <CloneNameplate
        label="Your Goal"
        sublabel={`By ${deadline}`}
        x={cloneASeparation}
        color="#22D3EE"
        progressPercent={percent}
      />
    </>
  );
}
