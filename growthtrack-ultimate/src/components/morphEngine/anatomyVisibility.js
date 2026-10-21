/** Outfit determines viewport visibility; capture redaction is independent.
    `eligible` comes from anatomyEligibility (adult owner, matching declared
    asset). It must be explicitly true: any caller that omits it stays covered. */
export function isAnatomyVisible({ wardrobe, renderMode = 'normal', captureRedacted = false, eligible = false }) {
  return eligible === true && wardrobe === 'ANATOMICAL' && !captureRedacted && ['normal', 'ghost', 'delta', 'xray'].includes(renderMode);
}
