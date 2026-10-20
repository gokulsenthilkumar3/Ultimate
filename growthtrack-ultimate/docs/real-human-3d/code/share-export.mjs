// Decisions behind "screenshot" and "share" in the Physique viewer, kept pure so they can be tested.
//
// Today's screenshot is `canvas.toDataURL()` at the on-screen size, and Share opens a modal whose buttons do not attach
// the picture (the audit found no navigator.share in that path). The plan: render a still at a chosen scale in a
// separate render target, then hand it to the best sharing route the browser supports.

export const EXPORT_LIMITS = Object.freeze({ maxEdge: 8192, maxPixels: 33177600 });   // 8192 x 4050 is the usual GPU-safe ceiling

/** Pixel size for a still at `scale` times the viewport, kept inside what the GPU can allocate. */
export function exportSize(viewportW, viewportH, { scale = 2, maxEdge = EXPORT_LIMITS.maxEdge, maxPixels = EXPORT_LIMITS.maxPixels, maxTexture = maxEdge } = {}) {
  if (!(viewportW > 0 && viewportH > 0)) throw new RangeError('viewport must have a size');
  let w = viewportW * scale; let h = viewportH * scale;
  const edgeLimit = Math.min(maxEdge, maxTexture);
  const factor = Math.min(1, edgeLimit / Math.max(w, h), Math.sqrt(maxPixels / (w * h)));
  w = Math.max(1, Math.floor(w * factor)); h = Math.max(1, Math.floor(h * factor));
  return { width: w, height: h, scale: w / viewportW, clamped: factor < 1 };
}

/** The best route to share `file` from this browser. `nav` is `navigator` (injected for tests). */
export function chooseShareMethod(nav, file) {
  if (nav && typeof nav.share === 'function' && typeof nav.canShare === 'function' && file) {
    try { if (nav.canShare({ files: [file] })) return 'native-files'; } catch { /* fall through */ }
  }
  if (nav && typeof nav.clipboard?.write === 'function' && typeof globalThis.ClipboardItem === 'function') return 'clipboard-image';
  return 'download';
}

/** Capture rules that never change: private anatomy and its cover key never reach a still, a share or an export. */
export function mustRedact({ privateAnatomyVisible, wardrobe, exportKind }) {
  if (exportKind === 'share' || exportKind === 'screenshot' || exportKind === 'presentation-snapshot') return Boolean(privateAnatomyVisible) || wardrobe === 'ANATOMICAL';
  return false;
}

export function safeFilename(label, date = new Date()) {
  const stem = String(label || 'physique').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'physique';
  return `${stem}-${date.toISOString().slice(0, 10)}.png`;
}
