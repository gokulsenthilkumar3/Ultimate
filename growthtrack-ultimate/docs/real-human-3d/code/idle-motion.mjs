// A person standing still is never still. This module produces the small motions that make a figure read as alive:
// blinks, breathing and eye saccades. It is deterministic from a seed (the same person blinks the same way every
// session and in every test) and independent of frame rate: ask for a value at any time `t` in seconds.
//
// Typical adult values used as defaults: about 15 to 20 blinks a minute, each lasting 0.15 to 0.3 s, closing faster than
// opening; 12 to 16 breaths a minute, inhale shorter than exhale; gaze that rests for a fraction of a second to about
// two seconds and then jumps a degree or so.

function mulberry32(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

export const IDLE_DEFAULTS = Object.freeze({
  blinkMeanSec: 3.6, blinkCloseSec: 0.08, blinkHoldSec: 0.03, blinkOpenSec: 0.15, doubleBlinkChance: 0.18,
  breathsPerMin: 14, inhaleShare: 0.4,
  saccadeHoldMin: 0.4, saccadeHoldMax: 2.0, saccadeYawDeg: 1.6, saccadePitchDeg: 1.0, saccadeSec: 0.04,
});

export function createIdle(seed = 1, options = {}) {
  const o = { ...IDLE_DEFAULTS, ...options };
  // One stream per channel, so asking for blinks before gaze (or the reverse) cannot change either.
  const randBlink = mulberry32(seed * 3 + 1); const randGaze = mulberry32(seed * 3 + 2); const randBreath = mulberry32(seed * 3 + 3);

  // ---- blinks: a growing list of start times
  const blinks = []; let blinkClock = 0.5 + randBlink() * 2;
  const extendBlinks = (until) => {
    while (blinkClock < until + 12) {
      blinks.push(blinkClock);
      const jitter = Math.exp((randBlink() - 0.5) * 1.1);                       // log-normal-ish spread around the mean
      let gap = clamp(o.blinkMeanSec * jitter, 1.2, 9);
      if (randBlink() < o.doubleBlinkChance) { blinks.push(blinkClock + 0.28); gap += 0.3; }
      blinkClock += gap;
    }
  };

  // ---- saccades: target gaze offsets held for a while
  const gaze = [{ t: 0, yaw: 0, pitch: 0 }]; let gazeClock = 0;
  const extendGaze = (until) => {
    while (gazeClock < until + 6) {
      gazeClock += o.saccadeHoldMin + randGaze() * (o.saccadeHoldMax - o.saccadeHoldMin);
      gaze.push({ t: gazeClock, yaw: (randGaze() - 0.5) * 2 * o.saccadeYawDeg * Math.PI / 180, pitch: (randGaze() - 0.5) * 2 * o.saccadePitchDeg * Math.PI / 180 });
    }
  };

  const breathPeriod = 60 / o.breathsPerMin; const phaseOffset = randBreath();

  function blinkAmount(t) {
    extendBlinks(t);
    for (let i = blinks.length - 1; i >= 0; i -= 1) {
      const dt = t - blinks[i];
      if (dt < 0) continue;
      if (dt > o.blinkCloseSec + o.blinkHoldSec + o.blinkOpenSec) return 0;
      if (dt < o.blinkCloseSec) return smooth(dt / o.blinkCloseSec);
      if (dt < o.blinkCloseSec + o.blinkHoldSec) return 1;
      return 1 - smooth((dt - o.blinkCloseSec - o.blinkHoldSec) / o.blinkOpenSec);
    }
    return 0;
  }

  function breath(t) {
    const phase = (((t / breathPeriod) + phaseOffset) % 1 + 1) % 1;
    return phase < o.inhaleShare ? smooth(phase / o.inhaleShare) : 1 - smooth((phase - o.inhaleShare) / (1 - o.inhaleShare));
  }

  function gazeOffset(t) {
    extendGaze(t);
    let i = gaze.length - 1; while (i > 0 && gaze[i].t > t) i -= 1;
    const prev = gaze[Math.max(0, i - 1)]; const cur = gaze[i];
    const k = smooth((t - cur.t) / o.saccadeSec);
    return { yaw: prev.yaw + (cur.yaw - prev.yaw) * k, pitch: prev.pitch + (cur.pitch - prev.pitch) * k };
  }

  /** eyelid closure 0..1 (1 = shut), breath 0..1 (1 = fully inhaled), gaze offset in radians. */
  return { sample: (t) => ({ blink: blinkAmount(t), breath: breath(t), gaze: gazeOffset(t) }), blinkTimes: (until) => { extendBlinks(until); return blinks.filter((b) => b <= until); } };
}
