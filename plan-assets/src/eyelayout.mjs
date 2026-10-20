// Where each eye sits in the preview head: plain geometry (no three.js), so it can be tested in Node.

export function fitSphere(pos, ids) {
  const c = [0, 0, 0];
  for (const v of ids) for (let k = 0; k < 3; k += 1) c[k] += pos[v * 3 + k] / ids.length;
  const radius = () => ids.reduce((s, v) => s + Math.hypot(pos[v * 3] - c[0], pos[v * 3 + 1] - c[1], pos[v * 3 + 2] - c[2]), 0) / ids.length;
  for (let it = 0; it < 60; it += 1) {
    const R = radius(); const g = [0, 0, 0];
    for (const v of ids) {
      const d = [pos[v * 3] - c[0], pos[v * 3 + 1] - c[1], pos[v * 3 + 2] - c[2]]; const r = Math.hypot(...d) || 1;
      for (let k = 0; k < 3; k += 1) g[k] += ((r - R) * d[k]) / r;
    }
    for (let k = 0; k < 3; k += 1) c[k] += (0.5 * g[k]) / ids.length;
  }
  return { center: c, radius: radius() };
}

/**
 * Work out where each eye sits: the sphere of the eyeball (fitted on its front hemisphere) and of the glass shell.
 * `part` is the decoded eye part; `part.layer` is 0 for eyeball vertices and 1 for glass.
 */
export function buildEyes(part) {
  const n = part.pos.length / 3;
  return [1, -1].map(side => {
    const ball = []; const glass = [];
    for (let v = 0; v < n; v += 1) if ((part.pos[v * 3] > 0) === (side > 0)) (part.layer[v] === 0 ? ball : glass).push(v);
    let zMean = 0; for (const v of ball) zMean += part.pos[v * 3 + 2] / ball.length;
    const front = ball.filter(v => part.pos[v * 3 + 2] > zMean);
    const eye = fitSphere(part.pos, front); const shell = fitSphere(part.pos, glass);
    return { side, front, center: eye.center, radius: eye.radius, shellRadius: shell.radius, shellOffset: shell.center.map((v, k) => v - eye.center[k]) };
  });
}


/** Eye centres after the morphs: each eye's fitted centre moved by the mean displacement of its front vertices. */
export function eyeCentres(eyes, basePos, morphedPos) {
  return eyes.map(eye => {
    const d = [0, 0, 0];
    for (const v of eye.front) for (let k = 0; k < 3; k += 1) d[k] += (morphedPos[v * 3 + k] - basePos[v * 3 + k]) / eye.front.length;
    return eye.center.map((c, k) => c + d[k]);
  });
}
