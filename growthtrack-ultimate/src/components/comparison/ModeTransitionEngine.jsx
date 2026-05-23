import { Z_INDEX } from '../constants';
/**
 * GrowthTrack Ultimate — Layer 6: Comparison & Clone Engine
 * ModeTransitionEngine.jsx
 *
 * Cinematic transitions between the 6 viewport modes.
 *
 * Spec from architecture doc:
 *   GlitchPass fires for 1 frame on mode switch (already wired in PostProcessingStack)
 *   Cross-dissolve: clones fade out / fade in over 200ms
 *   Mode label flash: large centred mode name fades in then out (800ms total)
 *   Camera animates to optimal position for new mode (handled in CameraRig extension below)
 *
 * Implementation:
 *   - React context provides transition state to HUD elements
 *   - useTransitionOverlay: returns CSS overlay opacity for dissolve
 *   - ModeLabel: full-screen centred flash label (mounted outside Canvas)
 *   - useModeTransition: hook to subscribe to mode changes + trigger effects
 *
 * Architecture note:
 *   The GlitchPass in PostProcessingStack.jsx already fires on viewMode change
 *   (see Layer 4, useGlitchTrigger). This file handles:
 *     1. The HTML overlay cross-dissolve (canvas-level fade)
 *     2. The mode name flash label
 *     3. Camera position hints per mode (fed to CameraRig)
 *     4. Clone visibility gating (prevent z-fighting during transition)
 */

import React, {
  createContext, useContext, useRef, useState, useEffect, useCallback,
} from "react";
import { VIEW_MODES } from "../store/use3DStore";
import use3DStore     from "../store/use3DStore";

// ─────────────────────────────────────────────────────────────────────────────
// TRANSITION CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

const TransitionContext = createContext({
  isTransitioning:  false,
  transitionOpacity: 1,
  incomingMode:      null,
});

export function useTransitionContext() {
  return useContext(TransitionContext);
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE CONFIG — camera hints + display names per mode
// ─────────────────────────────────────────────────────────────────────────────

export const MODE_CONFIG = {
  [VIEW_MODES.SOLO]: {
    label:        "SOLO",
    sublabel:     "YOU",
    cameraPreset: "FRONT",
    // Extra hints for CameraRig to use
    cameraOverride: { azimuth: 0, elevation: 5, distance: 3.2 },
    accentColor:  "#4FC3F7",
  },
  [VIEW_MODES.DUAL]: {
    label:        "DUAL",
    sublabel:     "NOW  ←→  GOAL",
    cameraPreset: "FRONT",
    cameraOverride: { azimuth: 0, elevation: 5, distance: 4.5 },
    accentColor:  "#22D3EE",
  },
  [VIEW_MODES.GHOST]: {
    label:        "GHOST",
    sublabel:     "SUPERIMPOSED",
    cameraPreset: "FRONT",
    cameraOverride: { azimuth: 0, elevation: 5, distance: 3.5 },
    accentColor:  "#22D3EE",
  },
  [VIEW_MODES.SPLIT]: {
    label:        "SPLIT",
    sublabel:     "DRAG TO COMPARE",
    cameraPreset: "FRONT",
    cameraOverride: { azimuth: 0, elevation: 5, distance: 3.5 },
    accentColor:  "#7C3AED",
  },
  [VIEW_MODES.DELTA]: {
    label:        "DELTA",
    sublabel:     "GROWTH MAP",
    cameraPreset: "FRONT",
    cameraOverride: { azimuth: 0, elevation: 5, distance: 3.0 },
    accentColor:  "#10B981",
  },
  [VIEW_MODES.TIMELINE]: {
    label:        "TIMELINE",
    sublabel:     "SCRUB YOUR JOURNEY",
    cameraPreset: "FRONT",
    cameraOverride: { azimuth: 0, elevation: 5, distance: 3.2 },
    accentColor:  "#F59E0B",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// MODE TRANSITION HOOK
// Manages the transition lifecycle: out → hold → in
// ─────────────────────────────────────────────────────────────────────────────

const FADE_OUT_MS  = 80;   // canvas overlay fades to black
const HOLD_MS      = 30;   // brief black frame (glitch fires here)
const FADE_IN_MS   = 180;  // canvas overlay fades back to transparent
const LABEL_MS     = 900;  // mode label stays visible

/**
 * Returns transition state for canvas overlay and mode label.
 * @returns {{
 *   isTransitioning: boolean,
 *   overlayOpacity:  number,   // 0=transparent, 1=black
 *   currentMode:     string,
 *   prevMode:        string | null,
 * }}
 */
export function useModeTransition() {
  const [state, setState] = useState({
    isTransitioning: false,
    overlayOpacity:  0,
    currentMode:     use3DStore.getState().viewMode,
    prevMode:        null,
  });

  const animRef = useRef(null);

  useEffect(() => {
    return use3DStore.subscribe(
      (s) => s.viewMode,
      (newMode, prevMode) => {
        if (newMode === prevMode) return;

        // Clear any running animation
        if (animRef.current) clearTimeout(animRef.current);

        // Phase 1: fade out
        setState((s) => ({ ...s, isTransitioning: true, prevMode, currentMode: newMode }));

        // Use requestAnimationFrame cascade for smooth opacity
        let startTime = null;
        function animateOut(ts) {
          if (!startTime) startTime = ts;
          const p = Math.min(1, (ts - startTime) / FADE_OUT_MS);
          setState((s) => ({ ...s, overlayOpacity: p }));
          if (p < 1) requestAnimationFrame(animateOut);
          else {
            // Phase 2: hold
            animRef.current = setTimeout(() => {
              // Phase 3: fade in
              let startIn = null;
              function animateIn(ts2) {
                if (!startIn) startIn = ts2;
                const p2 = Math.min(1, (ts2 - startIn) / FADE_IN_MS);
                setState((s) => ({ ...s, overlayOpacity: 1 - p2 }));
                if (p2 < 1) requestAnimationFrame(animateIn);
                else {
                  setState((s) => ({
                    ...s,
                    isTransitioning: false,
                    overlayOpacity: 0,
                  }));
                }
              }
              requestAnimationFrame(animateIn);
            }, HOLD_MS);
          }
        }
        requestAnimationFrame(animateOut);
      }
    );
  }, []);

  return state;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSITION OVERLAY — mounts OUTSIDE Canvas (in the HTML layer)
// A full-viewport dark overlay that pulses on mode switch.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mount this as a sibling of <HumanoidViewer> in your page layout.
 * It positions itself absolutely over the canvas.
 *
 * @example
 *   <div style={{ position: "relative" }}>
 *     <HumanoidViewer />
 *     <TransitionOverlay />
 *   </div>
 */
export function TransitionOverlay() {
  const { overlayOpacity, currentMode } = useModeTransition();
  const config = MODE_CONFIG[currentMode] ?? MODE_CONFIG[VIEW_MODES.DUAL];

  return (
    <div
      aria-hidden="true"
      style={{
        position:       "absolute",
        inset:          0,
        pointerEvents:  "none",
        zIndex: Z_INDEX.FLOATING_ELEMENT,
        background:     "#020307",
        opacity:        overlayOpacity,
        transition:     "none",
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODE LABEL FLASH — large centred label that fades in + out on mode change
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mount this as a sibling of <HumanoidViewer>.
 * Shows the mode name (e.g. "DUAL", "GHOST") for 900ms then fades.
 */
export function ModeLabelFlash() {
  const [visible, setVisible] = useState(false);
  const [opacity, setOpacity] = useState(0);
  const [mode, setMode]       = useState(null);
  const timerRef              = useRef(null);

  useEffect(() => {
    return use3DStore.subscribe(
      (s) => s.viewMode,
      (newMode) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setMode(newMode);
        setVisible(true);
        setOpacity(1);

        timerRef.current = setTimeout(() => {
          setOpacity(0);
          setTimeout(() => setVisible(false), 400);
        }, LABEL_MS - 400);
      }
    );
  }, []);

  if (!visible || !mode) return null;

  const config = MODE_CONFIG[mode] ?? MODE_CONFIG[VIEW_MODES.DUAL];

  return (
    <div
      aria-hidden="true"
      style={{
        position:       "absolute",
        inset:          0,
        pointerEvents:  "none",
        zIndex: Z_INDEX.SLIDER,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        gap:            "8px",
        opacity,
        transition:     `opacity ${opacity === 0 ? 400 : 120}ms ease`,
      }}
    >
      <div style={{
        fontFamily:    "'Outfit', sans-serif",
        fontSize:      "clamp(32px, 6vw, 72px)",
        fontWeight:    900,
        letterSpacing: "0.22em",
        color:         config.accentColor,
        filter:        `drop-shadow(0 0 40px ${config.accentColor}88)`,
        lineHeight:    "1",
      }}>
        {config.label}
      </div>
      <div style={{
        fontFamily:    "'Outfit', sans-serif",
        fontSize:      "clamp(10px, 1.4vw, 14px)",
        fontWeight:    500,
        letterSpacing: "0.3em",
        color:         "#4A6080",
        textTransform: "uppercase",
      }}>
        {config.sublabel}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSITION PROVIDER — wraps the 3D viewer page
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps the viewer area. Provides transition context to child components.
 *
 * @example
 *   <ModeTransitionProvider>
 *     <div style={{ position: "relative", width: "100%", height: "100%" }}>
 *       <HumanoidViewer />
 *       <TransitionOverlay />
 *       <ModeLabelFlash />
 *     </div>
 *   </ModeTransitionProvider>
 */
export function ModeTransitionProvider({ children }) {
  const transition = useModeTransition();

  return (
    <TransitionContext.Provider value={transition}>
      {children}
    </TransitionContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CAMERA OVERRIDE HELPER
// CameraRig.jsx can import this to get per-mode camera positions.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the optimal camera position for a given view mode.
 * @param {string} mode - VIEW_MODES key
 * @returns {{ azimuth: number, elevation: number, distance: number }}
 */
export function getCameraHintForMode(mode) {
  return MODE_CONFIG[mode]?.cameraOverride ?? { azimuth: 0, elevation: 5, distance: 3.5 };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLONE TRANSITION GATE
// Returns whether a clone should be visible during a transition.
// Prevents z-fighting while old/new clones are fading.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns opacity multiplier for clone rendering during transitions.
 * @param {boolean} isTransitioning
 * @param {number} overlayOpacity - current overlay fade progress
 * @returns {number} 0–1 opacity factor
 */
export function cloneTransitionOpacity(isTransitioning, overlayOpacity) {
  if (!isTransitioning) return 1;
  return 1 - overlayOpacity * 0.6; // partial fade (not fully black, just dim)
}
