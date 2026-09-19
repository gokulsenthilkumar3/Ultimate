/** Outfit determines viewport visibility; capture redaction is independent. */
export function isAnatomyVisible({ wardrobe, renderMode = 'normal', captureRedacted = false }) {
  return wardrobe === 'ANATOMICAL' && !captureRedacted && ['normal', 'ghost', 'delta', 'xray'].includes(renderMode);
}
