// Hair presets: styles (length map, how the hair leaves the scalp, how it falls), textures (straight to coily),
// natural shades, and the resolver that turns a friendly selection into the numbers the strand grower uses.
//
// Lengths are in centimetres on the head: top, front (fringe), sides (above and around the ears) and back (nape).
// A strand's length is looked up from where its root sits, so a fade or a long fringe is just a different length map.

/** Style presets. `sweep` is how the front hair is brushed; `lift` is the angle (degrees) the hair leaves the scalp. */
export const HAIR_STYLES = {
  bald: { label: 'Shaved', len: { top: 0, front: 0, side: 0, back: 0 }, lift: 0, gravity: 0, sweep: 'none', texture: 'straight', stubble: 0.22 },
  buzz: { label: 'Buzz cut', len: { top: 0.5, front: 0.5, side: 0.3, back: 0.3 }, lift: 85, gravity: 0, sweep: 'none', texture: 'straight', stubble: 0.7 },
  crop: { label: 'Short crop', len: { top: 2.6, front: 3.4, side: 0.9, back: 0.9 }, lift: 55, gravity: 0.05, sweep: 'forward', texture: 'straight', part: 'none' },
  sidepart: { label: 'Side part', len: { top: 6, front: 6.5, side: 2.6, back: 2.4 }, lift: 38, gravity: 0.22, sweep: 'side', texture: 'straight', part: 'left', volume: 0.55 },
  quiff: { label: 'Quiff', len: { top: 7, front: 8.5, side: 2.6, back: 2.4 }, lift: 50, gravity: 0.2, sweep: 'up', texture: 'wavy', part: 'none', volume: 0.5 },
  swept: { label: 'Swept back', len: { top: 7.5, front: 8.5, side: 3.2, back: 4.5 }, lift: 30, gravity: 0.28, sweep: 'back', texture: 'straight', part: 'none' },
  medium: { label: 'Medium', len: { top: 11, front: 11, side: 9.5, back: 11 }, lift: 30, gravity: 0.55, sweep: 'side', texture: 'straight', part: 'left' },
  long: { label: 'Long', len: { top: 24, front: 22, side: 27, back: 34 }, lift: 24, gravity: 0.95, sweep: 'sideback', texture: 'straight', part: 'centre' },
  curly: { label: 'Curly top', len: { top: 7, front: 6.5, side: 2.2, back: 2.4 }, lift: 72, gravity: 0.04, sweep: 'none', texture: 'curly', part: 'none' },
  afro: { label: 'Natural coils', len: { top: 8, front: 7, side: 5.5, back: 6 }, lift: 82, gravity: 0, sweep: 'none', texture: 'coily', part: 'none', volume: 0.7 },
};

/** Strand texture: wave radius (m) and turns per 10 cm of strand. */
export const HAIR_TEXTURES = {
  straight: { label: 'Straight', amp: 0, turns: 0 },
  wavy: { label: 'Wavy', amp: 0.0032, turns: 3.2 },
  curly: { label: 'Curly', amp: 0.0042, turns: 6.5 },
  coily: { label: 'Coily', amp: 0.0034, turns: 10 },
};

/** Natural shades along the dark (eumelanin) and red-blond (pheomelanin) axes, plus the greys. */
export const HAIR_SHADES = {
  Black: '#1d1714',
  'Dark brown': '#33231a',
  Brown: '#4f3523',
  'Light brown': '#74533a',
  'Dark blonde': '#9a7b4b',
  Blonde: '#c9a463',
  Platinum: '#dccdaa',
  Auburn: '#5f2c1d',
  Ginger: '#9a4a22',
  Grey: '#8f8d8a',
  White: '#dbd8d2',
};

export const HAIR_THICKNESS = { fine: 0.00005, medium: 0.00008, coarse: 0.00012 };

export const DEFAULT_HAIR = { style: 'sidepart', texture: null, shade: 'Brown', color: null, grey: 0, length: 1, density: 1, thickness: 'medium', part: null, hairline: { height: 0, recession: 0 }, volume: null, shine: 0.6 };

/** Turn the friendly selection into the numbers the strand grower uses (metres, radians). */
export function resolveHair(sel = {}) {
  const input = { ...DEFAULT_HAIR, ...sel, hairline: { ...DEFAULT_HAIR.hairline, ...(sel.hairline || {}) } };
  const style = HAIR_STYLES[input.style] || HAIR_STYLES.sidepart;
  const textureName = input.texture || style.texture; const texture = HAIR_TEXTURES[textureName] || HAIR_TEXTURES.straight;
  const scale = Math.max(0.2, Math.min(2.5, input.length));
  const len = Object.fromEntries(Object.entries(style.len).map(([k, v]) => [k, (v / 100) * scale]));
  const maxLen = Math.max(...Object.values(len));
  const turns = texture.turns * maxLen * 10;
  const points = Math.max(5, Math.min(22, Math.round(5 + maxLen * 28 + turns * 3.4)));
  return {
    input, style, bald: maxLen < 0.0008, len, maxLen, points, textureName, curl: { amp: texture.amp, turns: texture.turns },
    lift: ((style.lift || 40) * Math.PI) / 180, gravity: style.gravity, sweep: style.sweep, part: input.part || style.part || 'none',
    volume: input.volume ?? style.volume ?? 0.25, density: Math.max(0.15, Math.min(1.6, input.density)), width: HAIR_THICKNESS[input.thickness] || HAIR_THICKNESS.medium,
    color: input.color || HAIR_SHADES[input.shade] || HAIR_SHADES.Brown, grey: Math.max(0, Math.min(1, input.grey)), stubble: style.stubble ?? 0, hairline: input.hairline, shine: input.shine,
  };
}
