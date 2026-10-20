// Colour choices offered in the plan's face controls. Skin, iris, sclera and lip colours are sRGB hex.

/** Ten skin tone steps from very fair to deepest, chosen as albedo (skin as lit, not as photographed). */
export const SKIN_TONES = [
  { id: 1, name: 'Very fair', hex: '#ecc9b6' }, { id: 2, name: 'Fair', hex: '#e3b9a0' }, { id: 3, name: 'Light', hex: '#d8a68a' },
  { id: 4, name: 'Light-medium', hex: '#cc9373' }, { id: 5, name: 'Medium', hex: '#bc8970' }, { id: 6, name: 'Medium-tan', hex: '#a87257' },
  { id: 7, name: 'Tan', hex: '#8b5a42' }, { id: 8, name: 'Brown', hex: '#6d4331' }, { id: 9, name: 'Deep brown', hex: '#4d2f22' }, { id: 10, name: 'Deepest', hex: '#35211a' },
];

/** Undertone: a small colour shift applied under the chosen tone (multiplies red, green, blue). */
export const UNDERTONES = {
  Cool: [0.965, 0.985, 1.04], Neutral: [1, 1, 1], Warm: [1.045, 1.0, 0.925], Olive: [0.98, 1.025, 0.9],
};

export const SCLERA = { Bright: '#f1ebe5', Natural: '#e8dfd6', Warm: '#e0d2bd' };

export const LIP_COLORS = { Natural: null, Rose: '#c2606b', Berry: '#9b3f55', Coral: '#d7685a', Nude: '#b98270', Plum: '#6b2f45' };

/** Natural lip colour for a skin tone: redder and a little darker than the skin around it. */
export function lipFromSkin(color) {
  const hsl = { h: 0, s: 0, l: 0 }; color.getHSL(hsl, 'srgb');
  const out = color.clone();
  out.setHSL(hsl.l > 0.45 ? 0.995 : 0.985, Math.min(0.5, 0.28 + hsl.s * 0.3), hsl.l * (hsl.l > 0.45 ? 0.76 : 0.7), 'srgb');
  return out;
}
