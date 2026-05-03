/**
 * GrowthTrack Ultimate — Layer 6: Comparison & Clone Engine
 * BodyPartInfoPanel.jsx
 *
 * Info panel that slides in from the right when a body part is clicked.
 *
 * Spec from architecture doc:
 *   Click any region → panel slides in from right with:
 *     - Current measurement vs goal measurement
 *     - Health status (from BODY_PARTS data)
 *     - Issues & fixes (from userData.js)
 *     - Delta visualisation (how much it needs to change)
 *     - Related exercises
 *     - Anatomy depth auto-adjusts to show relevant layer
 *
 * This is a pure HTML/CSS component (not inside Canvas).
 * It reads focusedBodyPart from the store and displays contextual info.
 *
 * Mount outside the Canvas, as a sibling of <HumanoidViewer>.
 */

import React, { useEffect, useRef, useMemo } from "react";
import { useShallow }                         from "zustand/react/shallow";
import use3DStore                             from "../store/use3DStore";
import { BODY_PART_REGIONS }                  from "../morphEngine/BodyPartInteraction";

// ─────────────────────────────────────────────────────────────────────────────
// BODY PART KNOWLEDGE BASE
// Defines health context, issues, exercises for each body part.
// In production this would be imported from userData.js or an API.
// ─────────────────────────────────────────────────────────────────────────────

const BODY_PART_INFO = {
  chest: {
    title:        "Chest",
    anatomyDepth: 85,   // show muscle layer
    healthStatus: "DEVELOPING",
    statusColor:  "#F59E0B",
    issues:       ["Underdeveloped pec mass", "Low upper chest activation"],
    fixes:        ["Incline DB press 4×10", "Cable crossover 3×15", "Dips to failure"],
    exercises:    ["Bench Press", "Incline Press", "Pec Deck", "Dips"],
    primaryMetric: "chest",
    relatedMetrics:["shoulders"],
  },
  shoulders: {
    title:        "Shoulders",
    anatomyDepth: 80,
    healthStatus: "STRONG",
    statusColor:  "#10B981",
    issues:       ["Slight anterior dominance"],
    fixes:        ["Rear delt focus", "Face pulls 3×20", "External rotation work"],
    exercises:    ["OHP", "Lateral Raises", "Face Pulls", "Arnold Press"],
    primaryMetric: "shoulders",
    relatedMetrics:["chest", "arms"],
  },
  leftArm: {
    title:        "Left Arm",
    anatomyDepth: 75,
    healthStatus: "LAGGING",
    statusColor:  "#F43F5E",
    issues:       ["Size deficit vs right", "Weak brachialis"],
    fixes:        ["Unilateral hammer curls", "Concentration curls 4×12"],
    exercises:    ["Barbell Curl", "Hammer Curl", "Preacher Curl"],
    primaryMetric: "arms",
    relatedMetrics:["forearm"],
  },
  rightArm: {
    title:        "Right Arm",
    anatomyDepth: 75,
    healthStatus: "DEVELOPING",
    statusColor:  "#F59E0B",
    issues:       ["Below target peak"],
    fixes:        ["EZ bar curl 4×12", "Tricep pushdown 4×15"],
    exercises:    ["Barbell Curl", "Tricep Pushdown", "Skull Crushers"],
    primaryMetric: "arms",
    relatedMetrics:["forearm"],
  },
  waist: {
    title:        "Core & Waist",
    anatomyDepth: 70,
    healthStatus: "PRIORITY",
    statusColor:  "#F43F5E",
    issues:       ["Excess visceral fat", "Anterior pelvic tilt straining core"],
    fixes:        ["Caloric deficit 300–500 kcal/day", "Anti-rotation core work", "Dead bugs 3×12"],
    exercises:    ["Planks", "Dead Bugs", "Cable Woodchops", "Hanging Leg Raises"],
    primaryMetric: "waist",
    relatedMetrics:["bodyFat"],
  },
  glutes: {
    title:        "Glutes & Hips",
    anatomyDepth: 72,
    healthStatus: "DEVELOPING",
    statusColor:  "#F59E0B",
    issues:       ["Underdeveloped glute medius", "Weak posterior chain"],
    fixes:        ["Hip thrusts 4×12", "Romanian deadlifts", "Glute bridges"],
    exercises:    ["Hip Thrusts", "RDL", "Bulgarian Split Squat", "Cable Kickbacks"],
    primaryMetric: "glutes",
    relatedMetrics:["hips", "thighs"],
  },
  leftThigh: {
    title:        "Left Thigh",
    anatomyDepth: 72,
    healthStatus: "DEVELOPING",
    statusColor:  "#F59E0B",
    issues:       ["Quad sweep lacking", "VMO underdeveloped"],
    fixes:        ["Terminal knee extensions", "Leg press depth", "Front squats"],
    exercises:    ["Squats", "Leg Press", "Leg Extensions", "Lunges"],
    primaryMetric: "thighs",
    relatedMetrics:["calves"],
  },
  rightThigh: {
    title:        "Right Thigh",
    anatomyDepth: 72,
    healthStatus: "DEVELOPING",
    statusColor:  "#F59E0B",
    issues:       ["Symmetry with left", "Hamstring tightness"],
    fixes:        ["Nordic curls", "RDL single-leg", "Hamstring curls"],
    exercises:    ["Squats", "RDL", "Leg Curl", "Walking Lunges"],
    primaryMetric: "thighs",
    relatedMetrics:["calves"],
  },
  calves: {
    title:        "Calves",
    anatomyDepth: 68,
    healthStatus: "LAGGING",
    statusColor:  "#F43F5E",
    issues:       ["Genetically stubborn", "Gastroc flat"],
    fixes:        ["Standing calf raises 5×20 daily", "Seated calf raises 4×15", "Single-leg raises"],
    exercises:    ["Standing Calf Raise", "Seated Calf Raise", "Donkey Calf Raise"],
    primaryMetric: "calves",
    relatedMetrics:["ankle"],
  },
  head: {
    title:        "Head & Neck",
    anatomyDepth: 90,
    healthStatus: "POSTURE ISSUE",
    statusColor:  "#F59E0B",
    issues:       ["Forward head posture 8°", "Neck tightness"],
    fixes:        ["Chin tucks 3×15", "Neck stretches", "Screen height adjustment"],
    exercises:    ["Chin Tucks", "Neck Flexion", "Face Pulls"],
    primaryMetric: "neck",
    relatedMetrics:[],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DELTA BAR — visual delta indicator
// ─────────────────────────────────────────────────────────────────────────────

function DeltaBar({ current, goal, unit, isLossPositive = false }) {
  const delta       = goal - current;
  const absD        = Math.abs(delta);
  const isPositive  = isLossPositive ? delta < 0 : delta > 0;
  const color       = isPositive ? "#10B981" : delta === 0 ? "#334455" : "#F43F5E";
  const pct         = Math.min(100, (current / Math.max(current, goal)) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#667788" }}>
        <span>Current: <strong style={{ color: "#4FC3F7" }}>{current}{unit}</strong></span>
        <span>Goal: <strong style={{ color: "#22D3EE" }}>{goal}{unit}</strong></span>
      </div>
      {/* Bar */}
      <div style={{ height: "4px", background: "#0D1520", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{
          width:        `${pct}%`,
          height:       "100%",
          background:   "#4FC3F7",
          borderRadius: "2px",
        }} />
      </div>
      {/* Delta */}
      <div style={{
        fontSize:    "11px",
        color,
        fontWeight:  700,
        filter:      `drop-shadow(0 0 4px ${color}88)`,
      }}>
        {isPositive ? "▲" : delta < 0 ? "▼" : "●"} {delta > 0 ? "+" : ""}{delta.toFixed(1)}{unit} to goal
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BODY PART INFO PANEL — main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * HTML panel — mount as sibling of <HumanoidViewer>.
 * Slides in from the right when focusedBodyPart is set in store.
 */
export default function BodyPartInfoPanel() {
  const { focusedBodyPart, setFocusedBodyPart, setAnatomyDepth, currentMetrics, goalMetrics } =
    use3DStore(useShallow((s) => ({
      focusedBodyPart:  s.focusedBodyPart,
      setFocusedBodyPart: s.setFocusedBodyPart,
      setAnatomyDepth:  s.setAnatomyDepth,
      currentMetrics:   s.cloneA.metrics,
      goalMetrics:      s.cloneB.metrics,
    })));

  const info = focusedBodyPart ? BODY_PART_INFO[focusedBodyPart] : null;

  // Auto-adjust anatomy depth when panel opens
  useEffect(() => {
    if (info?.anatomyDepth !== undefined) {
      setAnatomyDepth(info.anatomyDepth);
    } else if (!focusedBodyPart) {
      setAnatomyDepth(100); // restore full skin on close
    }
  }, [focusedBodyPart, info, setAnatomyDepth]);

  const primaryMetric  = info?.primaryMetric;
  const currentVal     = primaryMetric ? (currentMetrics[primaryMetric] ?? 0) : 0;
  const goalVal        = primaryMetric ? (goalMetrics[primaryMetric]    ?? 0) : 0;

  const isOpen = !!focusedBodyPart && !!info;

  return (
    <div
      role="complementary"
      aria-label="Body part details"
      style={{
        position:       "absolute",
        top:            "50%",
        right:          0,
        transform:      `translate(${isOpen ? "0%" : "105%"}, -50%)`,
        transition:     "transform 0.42s cubic-bezier(0.16, 1, 0.3, 1)",
        width:          "min(300px, 85vw)",
        maxHeight:      "80vh",
        overflowY:      "auto",
        background:     "rgba(2, 5, 10, 0.94)",
        border:         "1px solid #1E2D3D",
        borderRight:    "none",
        borderRadius:   "12px 0 0 12px",
        padding:        "20px",
        zIndex:         40,
        fontFamily:     "'Outfit', sans-serif",
        backdropFilter: "blur(16px)",
        boxShadow:      "-8px 0 40px rgba(0,0,0,0.6)",
      }}
    >
      {info && (
        <>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#E0F0FF", letterSpacing: "-0.01em" }}>
                {info.title}
              </h3>
              <span style={{
                fontSize:    "10px",
                fontWeight:  700,
                letterSpacing:"0.15em",
                color:       info.statusColor,
                filter:      `drop-shadow(0 0 6px ${info.statusColor}88)`,
              }}>
                {info.healthStatus}
              </span>
            </div>
            <button
              onClick={() => setFocusedBodyPart(null)}
              aria-label="Close panel"
              style={{
                background: "none",
                border:     "1px solid #1E2D3D",
                borderRadius:"6px",
                color:      "#445566",
                cursor:     "pointer",
                padding:    "4px 8px",
                fontSize:   "12px",
              }}
            >
              ✕
            </button>
          </div>

          {/* Delta bar */}
          {primaryMetric && (
            <div style={{ marginBottom: "16px" }}>
              <DeltaBar
                current={currentVal}
                goal={goalVal}
                unit={primaryMetric === "bodyFat" ? "%" : "cm"}
                isLossPositive={primaryMetric === "waist" || primaryMetric === "bodyFat"}
              />
            </div>
          )}

          <hr style={{ border: "none", borderTop: "1px solid #0D1520", margin: "0 0 16px" }} />

          {/* Issues */}
          {info.issues?.length > 0 && (
            <div style={{ marginBottom: "14px" }}>
              <p style={{ margin: "0 0 6px", fontSize: "9px", color: "#445566", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Issues
              </p>
              {info.issues.map((issue, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "12px", color: "#8899AA", marginBottom: "4px" }}>
                  <span style={{ color: "#F43F5E", marginTop: "1px", flexShrink: 0 }}>●</span>
                  {issue}
                </div>
              ))}
            </div>
          )}

          {/* Fixes */}
          {info.fixes?.length > 0 && (
            <div style={{ marginBottom: "14px" }}>
              <p style={{ margin: "0 0 6px", fontSize: "9px", color: "#445566", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Fixes
              </p>
              {info.fixes.map((fix, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "12px", color: "#8899AA", marginBottom: "4px" }}>
                  <span style={{ color: "#10B981", marginTop: "1px", flexShrink: 0 }}>→</span>
                  {fix}
                </div>
              ))}
            </div>
          )}

          {/* Exercises */}
          {info.exercises?.length > 0 && (
            <div>
              <p style={{ margin: "0 0 8px", fontSize: "9px", color: "#445566", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                Key Exercises
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {info.exercises.map((ex, i) => (
                  <span key={i} style={{
                    background:   "#0D1520",
                    border:       "1px solid #1E2D3D",
                    borderRadius: "6px",
                    padding:      "4px 10px",
                    fontSize:     "11px",
                    color:        "#4FC3F7",
                    letterSpacing:"0.03em",
                  }}>
                    {ex}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
