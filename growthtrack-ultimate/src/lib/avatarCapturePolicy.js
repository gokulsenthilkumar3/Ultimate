// Decisions behind "screenshot" and "share" in the Physique viewer, kept pure so they can be tested.
//
// The runtime renders at the requested resolution through the active composer,
// then hands the protected image to the best sharing route the browser supports.

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

/** Prepare before the Share click so native sharing retains user activation. */
export function pngFileFromDataUrl(dataUrl, filename = safeFilename('physique')) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/png;base64,')) return null;
  const decoded = atob(dataUrl.slice('data:image/png;base64,'.length));
  const bytes = Uint8Array.from(decoded, character => character.charCodeAt(0));
  return new File([bytes], filename, {type:'image/png'});
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
