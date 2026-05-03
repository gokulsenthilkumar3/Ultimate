/**
 * GrowthTrack Ultimate — Layer 6: Comparison & Clone Engine
 * TimelineScrubber.jsx
 *
 * TIMELINE mode: interactive scrubber that morphs the model
 * between historical measurement snapshots.
 *
 * Spec from architecture doc:
 *   - Scrubable timeline of logged snapshots
 *   - Model morphs between historical states
 *   - "Trails" effect: slight ghost of previous state lingers briefly
 *   - Milestone markers on timeline track
 *   - Auto-play mode (loops through full journey)
 *
 * Component breakdown:
 *   TimelineScrubber   — the HTML/CSS scrubber bar (mounts outside Canvas)
 *   TimelineTrails     — ghost trail effect inside Canvas (R3F component)
 *   useTimelinePlayback — hook for auto-play logic
 *
 * Integration:
 *   Mount <TimelineScrubber /> in your page HTML layer.
 *   Mount <TimelineTrails /> inside CanvasScene.
 *   Both read/write use3DStore's timelineScrubIndex.
 */

import React, {
  useRef, useState, useEffect, useCallback, useMemo,
} from "react";
import { useFrame }        from "@react-three/fiber";
import { Html }            from "@react-three/drei";
import { useShallow }      from "zustand/react/shallow";
import * as THREE          from "three";

import use3DStore          from "../store/use3DStore";
import HumanoidClone       from "../morphEngine/HumanoidClone";

// ─────────────────────────────────────────────────────────────────────────────
// AUTO-PLAY HOOK
// ─────────────────────────────────────────────────────────────────────────────

const AUTOPLAY_SPEED  = 0.008;  // index units per frame at 60fps
const AUTOPLAY_PAUSE  = 1200;   // ms to pause at each end before reversing

/**
 * Drives the timeline scrub index automatically.
 * Returns { isPlaying, toggle }.
 */
export function useTimelinePlayback() {
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [direction,  setDirection]  = useState(1);
  const pauseTimer                  = useRef(null);

  const { timelineSnaps, scrubTimeline, timelineScrubIndex } = use3DStore(
    useShallow((s) => ({
      timelineSnaps:      s.timelineSnaps,
      scrubTimeline:      s.scrubTimeline,
      timelineScrubIndex: s.timelineScrubIndex,
    }))
  );

  const maxIndex = Math.max(0, timelineSnaps.length - 1);

  useEffect(() => {
    if (!isPlaying) return;

    let rafId;
    function tick() {
      const current = use3DStore.getState().timelineScrubIndex ?? 0;
      const next    = current + AUTOPLAY_SPEED * direction;

      if (next >= maxIndex) {
        // Hit the end — pause, then reverse
        scrubTimeline(maxIndex);
        setDirection(-1);
        clearTimeout(pauseTimer.current);
        pauseTimer.current = setTimeout(() => {
          rafId = requestAnimationFrame(tick);
        }, AUTOPLAY_PAUSE);
        return;
      }

      if (next <= 0) {
        // Hit the start — pause, then forward
        scrubTimeline(0);
        setDirection(1);
        clearTimeout(pauseTimer.current);
        pauseTimer.current = setTimeout(() => {
          rafId = requestAnimationFrame(tick);
        }, AUTOPLAY_PAUSE);
        return;
      }

      scrubTimeline(next);
      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(pauseTimer.current);
    };
  }, [isPlaying, direction, maxIndex, scrubTimeline]);

  const toggle = useCallback(() => {
    setIsPlaying((p) => {
      if (!p) {
        // Start from beginning if at end
        const idx = use3DStore.getState().timelineScrubIndex;
        if (idx === null || idx >= maxIndex) {
          use3DStore.getState().scrubTimeline(0);
          setDirection(1);
        }
      }
      return !p;
    });
  }, [maxIndex]);

  return { isPlaying, toggle };
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE SCRUBBER — HTML component (mount outside Canvas)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Horizontal scrubber bar with milestone markers.
 * Mounts in the HTML layer below or above the 3D canvas.
 */
export default function TimelineScrubber({ style = {} }) {
  const trackRef = useRef();

  const {
    timelineSnaps,
    timelineScrubIndex,
    scrubTimeline,
    ambitionPath,
  } = use3DStore(useShallow((s) => ({
    timelineSnaps:      s.timelineSnaps,
    timelineScrubIndex: s.timelineScrubIndex,
    scrubTimeline:      s.scrubTimeline,
    ambitionPath:       s.ambitionPath,
  })));

  const { isPlaying, toggle } = useTimelinePlayback();

  const maxIndex   = Math.max(0, timelineSnaps.length - 1);
  const scrubValue = timelineScrubIndex ?? 0;

  // Current snapshot info for display
  const currentSnapIdx = Math.min(Math.round(scrubValue), maxIndex);
  const currentSnap    = timelineSnaps[currentSnapIdx];

  // ── Pointer drag on track ──────────────────────────────────────────────────
  const isDragging = useRef(false);

  const scrubFromPointer = useCallback((e) => {
    if (!trackRef.current) return;
    const rect  = trackRef.current.getBoundingClientRect();
    const pct   = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    scrubTimeline(pct * maxIndex);
  }, [maxIndex, scrubTimeline]);

  const handlePointerDown = useCallback((e) => {
    isDragging.current = true;
    scrubFromPointer(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [scrubFromPointer]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current) return;
    scrubFromPointer(e);
  }, [scrubFromPointer]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const progress = maxIndex > 0 ? (scrubValue / maxIndex) * 100 : 0;

  return (
    <div style={{
      position:      "absolute",
      bottom:        "24px",
      left:          "50%",
      transform:     "translateX(-50%)",
      width:         "min(680px, 90vw)",
      zIndex:        30,
      fontFamily:    "'Outfit', sans-serif",
      ...style,
    }}>
      {/* Header row */}
      <div style={{
        display:       "flex",
        justifyContent:"space-between",
        alignItems:    "center",
        marginBottom:  "10px",
      }}>
        {/* Current snap label */}
        <div style={{ color: "#F59E0B", fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em" }}>
          {currentSnap?.label ?? "Month 0"}
        </div>

        {/* Play/pause button */}
        <button
          onClick={toggle}
          style={{
            background:    "rgba(2,3,7,0.85)",
            border:        "1px solid #F59E0B44",
            borderRadius:  "20px",
            padding:       "5px 16px",
            color:         "#F59E0B",
            fontSize:      "11px",
            fontWeight:    700,
            letterSpacing: "0.12em",
            cursor:        "pointer",
            backdropFilter:"blur(8px)",
          }}
        >
          {isPlaying ? "⏸ PAUSE" : "▶ PLAY"}
        </button>

        {/* Date label */}
        <div style={{ color: "#445566", fontSize: "11px", letterSpacing: "0.08em" }}>
          {currentSnap?.date
            ? new Date(currentSnap.date).toLocaleDateString("en-US", { month: "short", year: "numeric" })
            : ""}
        </div>
      </div>

      {/* Track container */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position:  "relative",
          height:    "32px",
          cursor:    "pointer",
          userSelect:"none",
        }}
      >
        {/* Track background */}
        <div style={{
          position:     "absolute",
          top:          "50%",
          transform:    "translateY(-50%)",
          width:        "100%",
          height:       "3px",
          background:   "#0D1520",
          borderRadius: "2px",
        }} />

        {/* Progress fill */}
        <div style={{
          position:     "absolute",
          top:          "50%",
          transform:    "translateY(-50%)",
          width:        `${progress}%`,
          height:       "3px",
          background:   "linear-gradient(90deg, #F59E0B88, #F59E0B)",
          borderRadius: "2px",
          boxShadow:    "0 0 6px #F59E0B66",
        }} />

        {/* Snapshot tick marks */}
        {timelineSnaps.map((snap, i) => {
          const pct = maxIndex > 0 ? (i / maxIndex) * 100 : 0;
          return (
            <div
              key={snap.id}
              onClick={(e) => { e.stopPropagation(); scrubTimeline(i); }}
              title={snap.label}
              style={{
                position:     "absolute",
                top:          "50%",
                left:         `${pct}%`,
                transform:    "translate(-50%, -50%)",
                width:        "6px",
                height:       "6px",
                borderRadius: "50%",
                background:   i <= currentSnapIdx ? "#F59E0B" : "#1E2D3D",
                border:       `1px solid ${i <= currentSnapIdx ? "#F59E0B" : "#334455"}`,
                boxShadow:    i === currentSnapIdx ? "0 0 8px #F59E0B" : "none",
                cursor:       "pointer",
                zIndex:       2,
                transition:   "background 0.2s",
              }}
            />
          );
        })}

        {/* Milestone markers */}
        {(ambitionPath?.milestones ?? []).map((milestone) => {
          const pct = maxIndex > 0
            ? Math.min(100, (milestone.monthIndex / Math.max(1, ambitionPath.targetMonthIndex)) * 100)
            : 0;
          return (
            <div
              key={milestone.id}
              title={milestone.label}
              style={{
                position:     "absolute",
                top:          "50%",
                left:         `${pct}%`,
                transform:    "translate(-50%, -50%)",
                width:        "10px",
                height:       "10px",
                borderRadius: "50%",
                background:   milestone.achieved ? "#22D3EE" : "#1E2D3D",
                border:       `2px solid ${milestone.achieved ? "#22D3EE" : "#22D3EE44"}`,
                boxShadow:    milestone.achieved ? "0 0 10px #22D3EE88" : "none",
                cursor:       "pointer",
                zIndex:       3,
              }}
            />
          );
        })}

        {/* Thumb */}
        <div style={{
          position:     "absolute",
          top:          "50%",
          left:         `${progress}%`,
          transform:    "translate(-50%, -50%)",
          width:        "14px",
          height:       "14px",
          borderRadius: "50%",
          background:   "#F59E0B",
          border:       "2px solid #020307",
          boxShadow:    "0 0 12px #F59E0B",
          zIndex:       4,
          pointerEvents:"none",
        }} />
      </div>

      {/* Snap note */}
      {currentSnap?.note && (
        <div style={{
          marginTop:     "8px",
          textAlign:     "center",
          fontSize:      "10px",
          color:         "#445566",
          fontStyle:     "italic",
          letterSpacing: "0.05em",
        }}>
          "{currentSnap.note}"
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TIMELINE TRAILS — ghost effect inside R3F canvas
// Shows a faint silhouette of the previous snapshot state while scrubbing.
// ─────────────────────────────────────────────────────────────────────────────

const TRAIL_OPACITY       = 0.08;
const TRAIL_FADE_SPEED    = 0.04;  // opacity drop per frame

/**
 * R3F component — mounts inside CanvasScene when viewMode === TIMELINE.
 * Renders up to 2 ghost trails of past positions.
 */
export function TimelineTrails() {
  const timelineScrubIndex = use3DStore((s) => s.timelineScrubIndex);

  // Store previous N scrub positions for trail ghost
  const trailPositions = useRef([]);
  const prevIndex      = useRef(null);

  useFrame(() => {
    const idx = use3DStore.getState().timelineScrubIndex;
    if (idx !== null && idx !== prevIndex.current) {
      // Record previous index as trail
      if (prevIndex.current !== null) {
        trailPositions.current.push({
          index:   prevIndex.current,
          opacity: TRAIL_OPACITY,
        });
        if (trailPositions.current.length > 2) {
          trailPositions.current.shift();
        }
      }
      prevIndex.current = idx;
    }

    // Fade trails
    trailPositions.current = trailPositions.current
      .map((t) => ({ ...t, opacity: t.opacity - TRAIL_FADE_SPEED }))
      .filter((t) => t.opacity > 0.005);
  });

  // Trails are rendered as very-low-opacity ghost clones
  // The TimelineClone in CloneEngine handles the primary scrubbed model.
  // Trails are just semi-transparent overlapping HumanoidClones.
  // NOTE: They all read from cloneA (which gets updated by TimelineClone's subscriber).
  // For true independent trails, a separate metrics store slice would be needed.
  // This simplified version provides the visual illusion using low opacity.

  if (trailPositions.current.length === 0) return null;

  return (
    <>
      {trailPositions.current.map((trail, i) => (
        <HumanoidClone
          key={`trail-${i}`}
          cloneKey="A"
          position={[0, 0, -0.015 * (i + 1)]}  // slight z-offset to avoid z-fighting
          opacity={trail.opacity}
          renderMode="ghost"
          snapWeights={true}
          visible={true}
        />
      ))}
    </>
  );
}
