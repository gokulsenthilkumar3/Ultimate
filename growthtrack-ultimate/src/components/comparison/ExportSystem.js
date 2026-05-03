/**
 * GrowthTrack Ultimate — Layer 6: Comparison & Clone Engine
 * ExportSystem.js
 *
 * Export system for 3 output types (from architecture doc):
 *
 *   QUICK SNAPSHOT:
 *     Current viewport → PNG download
 *     Watermark: "GrowthTrack Digital Twin | [date]"
 *     Metadata embedded: measurements, date, phase
 *
 *   COMPARISON CARD (shareable):
 *     Side-by-side: current vs goal (1080×1080, Instagram format)
 *     All measurements with delta arrows
 *     Progress percentage
 *     "By Dec 2026" label
 *     Dark premium card design
 *
 *   TIMELINE REEL:
 *     Animated WebM of morphing Month 0 → Now
 *     Each frame = one snapshot, smooth lerp between
 *     Auto-generates from timelineSnaps
 *
 * Implementation notes:
 *   - Snapshot: reads preserveDrawingBuffer:true canvas → toDataURL()
 *   - Comparison card: built on a hidden <canvas> with Canvas2D API
 *   - Timeline reel: uses MediaRecorder API + requestAnimationFrame loop
 *     to capture the R3F canvas while scrubbing the timeline programmatically
 *
 * VFX on export (lens flare + countdown flash):
 *   Triggers a CSS-layer flash overlay before capturing.
 *   The LensFlareFlash component mounts outside the canvas.
 */

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY — get R3F canvas element
// ─────────────────────────────────────────────────────────────────────────────

function getCanvas() {
  return document.querySelector("canvas");
}

/**
 * Returns a data URL from the WebGL canvas.
 * Requires preserveDrawingBuffer: true in HumanoidViewer.jsx (already set).
 * @returns {string | null}
 */
function captureCanvasFrame() {
  const canvas = getCanvas();
  if (!canvas) return null;
  return canvas.toDataURL("image/png");
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY — download a data URL
// ─────────────────────────────────────────────────────────────────────────────

function downloadDataUrl(dataUrl, filename) {
  const a    = document.createElement("a");
  a.href     = dataUrl;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ─────────────────────────────────────────────────────────────────────────────
// LENS FLARE FLASH — CSS overlay for export VFX
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Triggers a white flash overlay on the canvas container.
 * @param {number} [durationMs=300]
 */
export function triggerLensFlareFlash(durationMs = 300) {
  const el = document.getElementById("gt-lens-flare-overlay");
  if (!el) return;

  el.style.opacity    = "1";
  el.style.transition = "opacity 0ms";

  requestAnimationFrame(() => {
    el.style.opacity    = "0";
    el.style.transition = `opacity ${durationMs}ms ease`;
  });
}

/**
 * React component — mounts inside the viewer container.
 * Renders an invisible overlay div used by triggerLensFlareFlash.
 */
export function LensFlareOverlay() {
  return (
    <div
      id="gt-lens-flare-overlay"
      aria-hidden="true"
      style={{
        position:       "absolute",
        inset:          0,
        background:     "radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(200,230,255,0.6) 50%, transparent 80%)",
        opacity:        0,
        pointerEvents:  "none",
        zIndex:         50,
        transition:     "opacity 300ms ease",
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT 1 — QUICK SNAPSHOT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Captures the current WebGL canvas and downloads a watermarked PNG.
 * @param {{ metrics: Object, phase: string }} context - from store
 */
export async function exportQuickSnapshot(context = {}) {
  const { metrics = {}, phase = "Phase 1" } = context;

  // 1. Trigger lens flare VFX
  triggerLensFlareFlash(250);

  // 2. Wait one frame to ensure the flash is visible
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => requestAnimationFrame(r));

  // 3. Grab canvas frame
  const canvasDataUrl = captureCanvasFrame();
  if (!canvasDataUrl) {
    console.error("[ExportSystem] Could not capture canvas. Is preserveDrawingBuffer: true?");
    return;
  }

  // 4. Composite watermark onto a 2D canvas
  const img    = new Image();
  img.src      = canvasDataUrl;

  await new Promise((resolve, reject) => {
    img.onload  = resolve;
    img.onerror = reject;
  });

  const offscreen = document.createElement("canvas");
  offscreen.width  = img.width;
  offscreen.height = img.height;
  const ctx        = offscreen.getContext("2d");

  // Draw scene
  ctx.drawImage(img, 0, 0);

  // Watermark bar at bottom
  const barH = Math.round(img.height * 0.055);
  ctx.fillStyle = "rgba(2, 3, 7, 0.82)";
  ctx.fillRect(0, img.height - barH, img.width, barH);

  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  ctx.fillStyle = "#22D3EE";
  ctx.font      = `bold ${Math.round(barH * 0.38)}px "Outfit", sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText(`GrowthTrack Digital Twin`, img.width * 0.03, img.height - barH / 2);

  ctx.fillStyle = "#445566";
  ctx.font      = `${Math.round(barH * 0.30)}px "Outfit", sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText(
    `${metrics.weight ?? "--"}kg · ${metrics.bodyFat ?? "--"}% BF · ${dateStr}`,
    img.width * 0.97,
    img.height - barH / 2
  );

  // 5. Download
  const outputUrl  = offscreen.toDataURL("image/png");
  const filename   = `growthtrack-snapshot-${Date.now()}.png`;
  downloadDataUrl(outputUrl, filename);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT 2 — COMPARISON CARD (1080×1080)
// ─────────────────────────────────────────────────────────────────────────────

const CARD_W = 1080;
const CARD_H = 1080;

/** Draws a rounded rectangle path */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Generates and downloads a 1080×1080 comparison card.
 * @param {{
 *   currentMetrics: Object,
 *   goalMetrics:    Object,
 *   deltas:         Object,
 *   progressPercent:number,
 *   deadline:       string,
 *   snapshotDataUrl:string | null,  // optional: current viewport PNG
 * }} params
 */
export async function exportComparisonCard({
  currentMetrics  = {},
  goalMetrics     = {},
  deltas          = {},
  progressPercent = 0,
  deadline        = "Dec 2026",
  snapshotDataUrl = null,
} = {}) {
  const canvas = document.createElement("canvas");
  canvas.width  = CARD_W;
  canvas.height = CARD_H;
  const ctx     = canvas.getContext("2d");

  // ── Background ─────────────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_H);
  bg.addColorStop(0,   "#020307");
  bg.addColorStop(0.5, "#050B15");
  bg.addColorStop(1,   "#020307");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // ── Border ─────────────────────────────────────────────────────────────────
  roundRect(ctx, 16, 16, CARD_W - 32, CARD_H - 32, 24);
  ctx.strokeStyle = "#22D3EE22";
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  // ── Header ─────────────────────────────────────────────────────────────────
  ctx.fillStyle    = "#22D3EE";
  ctx.font         = "bold 28px Outfit, sans-serif";
  ctx.textAlign    = "center";
  ctx.textBaseline = "top";
  ctx.fillText("GROWTHTRACK DIGITAL TWIN", CARD_W / 2, 48);

  ctx.fillStyle = "#445566";
  ctx.font      = "500 16px Outfit, sans-serif";
  ctx.fillText("Physical Transformation Report", CARD_W / 2, 86);

  // ── Progress bar ───────────────────────────────────────────────────────────
  const barY  = 120;
  const barW  = CARD_W * 0.7;
  const barX  = (CARD_W - barW) / 2;
  ctx.fillStyle = "#0D1520";
  roundRect(ctx, barX, barY, barW, 6, 3);
  ctx.fill();

  ctx.fillStyle = "#22D3EE";
  roundRect(ctx, barX, barY, barW * (progressPercent / 100), 6, 3);
  ctx.fill();

  ctx.fillStyle    = "#22D3EE";
  ctx.font         = "bold 14px Outfit, sans-serif";
  ctx.textAlign    = "center";
  ctx.fillText(`${progressPercent}% TO GOAL · BY ${deadline.toUpperCase()}`, CARD_W / 2, 138);

  // ── Divider ────────────────────────────────────────────────────────────────
  ctx.strokeStyle = "#0D1520";
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(60, 165);
  ctx.lineTo(CARD_W - 60, 165);
  ctx.stroke();

  // ── Column headers ─────────────────────────────────────────────────────────
  ctx.font         = "bold 15px Outfit, sans-serif";
  ctx.textAlign    = "left";
  ctx.fillStyle    = "#4FC3F7";
  ctx.fillText("YOU NOW",   120, 185);

  ctx.textAlign    = "center";
  ctx.fillStyle    = "#334455";
  ctx.fillText("MEASUREMENT", CARD_W / 2, 185);

  ctx.textAlign    = "right";
  ctx.fillStyle    = "#22D3EE";
  ctx.fillText("YOUR GOAL",  CARD_W - 120, 185);

  // ── Measurements table ─────────────────────────────────────────────────────
  const ROWS = [
    { key: "weight",    label: "Weight",    unit: "kg",  isLossPos: false },
    { key: "bodyFat",   label: "Body Fat",  unit: "%",   isLossPos: true  },
    { key: "chest",     label: "Chest",     unit: "cm",  isLossPos: false },
    { key: "shoulders", label: "Shoulders", unit: "cm",  isLossPos: false },
    { key: "waist",     label: "Waist",     unit: "cm",  isLossPos: true  },
    { key: "arms",      label: "Arms",      unit: "cm",  isLossPos: false },
    { key: "thighs",    label: "Thighs",    unit: "cm",  isLossPos: false },
    { key: "calves",    label: "Calves",    unit: "cm",  isLossPos: false },
    { key: "neck",      label: "Neck",      unit: "cm",  isLossPos: false },
  ];

  const rowH  = 62;
  const startY = 215;

  ROWS.forEach((row, i) => {
    const y      = startY + i * rowH;
    const curr   = currentMetrics[row.key] ?? 0;
    const goal   = goalMetrics[row.key]    ?? 0;
    const delta  = goal - curr;
    const isGain = row.isLossPos ? delta < 0 : delta > 0;
    const dColor = Math.abs(delta) < 0.5 ? "#334455" : isGain ? "#10B981" : "#F43F5E";
    const sign   = delta > 0 ? "+" : "";

    // Row alternating bg
    if (i % 2 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.015)";
      roundRect(ctx, 60, y - 4, CARD_W - 120, rowH - 4, 6);
      ctx.fill();
    }

    // Current value
    ctx.font      = "bold 22px Outfit, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#4FC3F7";
    ctx.fillText(`${curr}${row.unit}`, 120, y + 14);

    // Label
    ctx.font      = "600 13px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#445566";
    ctx.fillText(row.label.toUpperCase(), CARD_W / 2, y + 8);

    // Delta
    ctx.font      = "bold 12px Outfit, sans-serif";
    ctx.fillStyle = dColor;
    ctx.fillText(`${sign}${delta.toFixed(1)}${row.unit}`, CARD_W / 2, y + 26);

    // Goal value
    ctx.font      = "bold 22px Outfit, sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = "#22D3EE";
    ctx.fillText(`${goal}${row.unit}`, CARD_W - 120, y + 14);
  });

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footerY = startY + ROWS.length * rowH + 24;
  ctx.fillStyle    = "#1E2D3D";
  roundRect(ctx, 60, footerY, CARD_W - 120, 2, 1);
  ctx.fill();

  const dateStr = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  ctx.font         = "500 13px Outfit, sans-serif";
  ctx.textAlign    = "center";
  ctx.fillStyle    = "#334455";
  ctx.fillText(`Generated ${dateStr} · GrowthTrack`, CARD_W / 2, footerY + 24);

  // ── Download ──────────────────────────────────────────────────────────────
  const outputUrl = canvas.toDataURL("image/png");
  downloadDataUrl(outputUrl, `growthtrack-comparison-${Date.now()}.png`);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT 3 — TIMELINE REEL (WebM via MediaRecorder)
// ─────────────────────────────────────────────────────────────────────────────

const REEL_FPS          = 24;
const REEL_HOLD_FRAMES  = 18;   // frames to hold each snapshot before lerping
const REEL_LERP_FRAMES  = 24;   // frames to lerp between snapshots

/**
 * Records the R3F canvas while programmatically scrubbing the timeline.
 * Downloads a .webm file when complete.
 *
 * @param {{ scrubTimeline: Function, timelineSnaps: Array }} store - from use3DStore.getState()
 * @param {Function} onProgress - (pct: 0–100) => void
 */
export async function exportTimelineReel(store, onProgress) {
  const canvas = getCanvas();
  if (!canvas) return;

  const { scrubTimeline, timelineSnaps } = store;
  if (!timelineSnaps?.length) return;

  const maxIdx = timelineSnaps.length - 1;

  // Check MediaRecorder support
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
    console.warn("[ExportSystem] MediaRecorder/VP9 not available — falling back to VP8");
  }

  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";

  const stream   = canvas.captureStream(REEL_FPS);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks   = [];

  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const reelPromise = new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url  = URL.createObjectURL(blob);
      downloadDataUrl(url, `growthtrack-reel-${Date.now()}.webm`);
      URL.revokeObjectURL(url);
      resolve();
    };
  });

  recorder.start();

  // Scrub programmatically through all snapshots
  let totalFrames = 0;
  const frameCount = (REEL_HOLD_FRAMES + REEL_LERP_FRAMES) * maxIdx + REEL_HOLD_FRAMES;

  for (let i = 0; i <= maxIdx; i++) {
    // Hold on snapshot i
    scrubTimeline(i);
    for (let f = 0; f < REEL_HOLD_FRAMES; f++) {
      await new Promise((r) => requestAnimationFrame(r));
      totalFrames++;
      onProgress?.(Math.round((totalFrames / frameCount) * 100));
    }

    if (i < maxIdx) {
      // Lerp to snapshot i+1
      for (let f = 0; f < REEL_LERP_FRAMES; f++) {
        const t = (f + 1) / REEL_LERP_FRAMES;
        scrubTimeline(i + t);
        await new Promise((r) => requestAnimationFrame(r));
        totalFrames++;
        onProgress?.(Math.round((totalFrames / frameCount) * 100));
      }
    }
  }

  recorder.stop();
  await reelPromise;

  // Restore live state
  scrubTimeline(null);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT BUTTON HOOK — convenience hook for UI buttons
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import use3DStore                from "../store/use3DStore";

/**
 * Returns handlers and loading state for all 3 export types.
 */
export function useExportSystem() {
  const [loading, setLoading] = useState(null); // null | "snapshot" | "card" | "reel"
  const [reelProgress, setReelProgress] = useState(0);

  const snapshot = useCallback(async () => {
    setLoading("snapshot");
    try {
      const s = use3DStore.getState();
      await exportQuickSnapshot({
        metrics: s.cloneA.metrics,
        phase:   `Month ${s.ambitionPath?.currentMonthIndex ?? 0}`,
      });
    } finally {
      setLoading(null);
    }
  }, []);

  const comparisonCard = useCallback(async () => {
    setLoading("card");
    try {
      const s = use3DStore.getState();
      await exportComparisonCard({
        currentMetrics:  s.cloneA.metrics,
        goalMetrics:     s.cloneB.metrics,
        deltas:          s.getDeltas(),
        progressPercent: s.getProgressPercent(),
        deadline:        s.ambitionPath?.deadline
          ? new Date(s.ambitionPath.deadline).toLocaleDateString("en-US", { month: "short", year: "numeric" })
          : "Dec 2026",
      });
    } finally {
      setLoading(null);
    }
  }, []);

  const timelineReel = useCallback(async () => {
    setLoading("reel");
    setReelProgress(0);
    try {
      const s = use3DStore.getState();
      await exportTimelineReel(
        { scrubTimeline: s.scrubTimeline, timelineSnaps: s.timelineSnaps },
        setReelProgress
      );
    } finally {
      setLoading(null);
      setReelProgress(0);
    }
  }, []);

  return { snapshot, comparisonCard, timelineReel, loading, reelProgress };
}
