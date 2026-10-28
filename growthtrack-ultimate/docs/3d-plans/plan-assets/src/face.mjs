// Face landmarks, region masks and (later) parametric deformation for the plan's preview head.
//
// Coordinates are metres in the preview body's model space (y up, +z forward, +x = the
// person's left). Landmarks are measured on the bundled humanoid mesh, so they are specific
// to that asset; the unit test guards that the asset has not changed underneath them.

/** Landmarks of the base (neutral) head. Left-side points are given with +x; mirror for the right. */
export const LM = {
  eye: [0.03, 0.8027, 0.1346],           // eyeball centre
  medialCanthus: [0.0155, 0.8015, 0.145],
  lateralCanthus: [0.0455, 0.803, 0.138],
  nasion: [0, 0.7985, 0.1478],
  glabella: [0, 0.822, 0.1518],
  pronasale: [0, 0.763, 0.1676],          // nose tip
  subnasale: [0, 0.7535, 0.157],
  alare: [0.0175, 0.757, 0.1545],         // nostril wing
  stomion: [0, 0.7315, 0.157],            // where the lips meet
  upperLip: [0, 0.7435, 0.1595],          // upper vermilion border
  lowerLip: [0, 0.7195, 0.15],            // lower vermilion border
  cheilion: [0.0285, 0.7305, 0.136],      // mouth corner
  pogonion: [0, 0.6965, 0.1455],          // chin front
  menton: [0, 0.685, 0.123],              // chin bottom
  ear: [0.0785, 0.796, 0.043],            // ear centre
  gonion: [0.0596, 0.7336, 0.089],        // jaw angle
  zygion: [0.065, 0.8, 0.12],             // cheekbone
};

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const bump = (d, r) => 1 - smooth(0.55 * r, r, d);          // 1 inside 0.55 r, fading to 0 at r
const dist = (x, y, z, p) => Math.hypot(x - p[0], y - p[1], z - p[2]);
const mirror = p => [-p[0], p[1], p[2]];

/**
 * Per-vertex region masks for the head, packed as two RGBA sets:
 *   A = lips (geometry only; the shader multiplies by the painted lip colour), blush, eye socket, thin skin
 *   B = oily (T-zone), freckle zone, lip seam, ear
 * Only head and neck vertices get values.
 */
export function faceMasks(pos, group) {
  const count = pos.length / 3;
  const A = new Float32Array(count * 4); const B = new Float32Array(count * 4);
  for (let v = 0; v < count; v += 1) {
    if (group[v] !== 5 && group[v] !== 4) continue;
    const x = pos[v * 3]; const y = pos[v * 3 + 1]; const z = pos[v * 3 + 2]; const ax = Math.abs(x);
    const sx = x >= 0 ? 1 : -1;
    const side = p => (sx > 0 ? p : mirror(p));
    const front = smooth(0.05, 0.11, z);
    // Lips: an ellipse around the mouth in the front plane.
    const lipD = Math.hypot(ax / 0.034, (y - 0.7315) / 0.0155);
    const lips = front * (1 - smooth(0.78, 1.0, lipD));
    // Blush: cheeks, nose tip, ears, a little on the forehead.
    const cheek = bump(dist(ax, y, z, [0.041, 0.774, 0.118]), 0.03);
    const noseTip = bump(dist(x, y, z, LM.pronasale), 0.014);
    const earD = dist(ax, y, z, [LM.ear[0], LM.ear[1], LM.ear[2]]);
    const ear = bump(earD, 0.04);
    const blush = Math.min(1, cheek * 0.9 + noseTip * 0.8 + ear * 0.9);
    // Eye socket: shadow around and under the eye, deeper toward the inner corner.
    const eye = side(LM.eye);
    const socket = Math.min(1, bump(Math.hypot((x - eye[0]) / 0.028, (y - (eye[1] - 0.004)) / 0.02, (z - eye[2]) / 0.05), 1) * 0.85 + bump(dist(x, y, z, side(LM.medialCanthus)), 0.014) * 0.5);
    // Thin skin that glows when backlit: ears, nostril wings, nose tip.
    const thin = Math.min(1, ear * 0.9 + bump(dist(ax, y, z, [LM.alare[0], LM.alare[1], LM.alare[2]]), 0.011) + noseTip * 0.5);
    // T-zone: forehead centre, nose bridge/tip, chin.
    const oily = Math.min(1, bump(dist(x, y, z, [0, 0.838, 0.15]), 0.05) * 0.8 + bump(dist(x, y, z, [0, 0.775, 0.163]), 0.034) + bump(dist(x, y, z, LM.pogonion), 0.022) * 0.6);
    // Freckle zone: nose bridge and cheeks.
    const freckle = Math.min(1, cheek + bump(dist(x, y, z, [0, 0.784, 0.158]), 0.03));
    // Lip seam: the dark line where the lips meet.
    const seam = front * (1 - smooth(0.0004, 0.0016, Math.abs(y - LM.stomion[1]))) * (1 - smooth(0.74, 0.98, ax / 0.0285));
    A.set([lips, blush, socket, thin], v * 4); B.set([oily, freckle, seam, ear], v * 4);
  }
  return { A, B };
}
