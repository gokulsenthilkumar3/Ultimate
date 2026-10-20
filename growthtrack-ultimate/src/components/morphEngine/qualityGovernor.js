// Quality tiers and the automatic governor for the Physique 3D viewer.
//
// Today the three tiers differ only in shadow size and post effects: the audit measured the same canvas size, the same
// antialias flag and the same pixel ratio under Performance, Balanced and High (docs/real-human-3d/01-findings.md).
// Here a tier is a full bundle of the settings that cost frame time, and the governor moves between tiers from measured
// frame times, with hysteresis so it cannot flap.
//
// The numbers in TIERS are starting values to be benchmarked on the device matrix in 08-roadmap.md, not measurements.

export const TIER_ORDER = Object.freeze(['LOW', 'BALANCED', 'HIGH']);

export const TIERS = Object.freeze({
  LOW:      { dprCap: 1,    msaa: 0, shadowMap: 0,    hair: 'cards',   hairStrands: 0,      skin: 'lambert-sss', micro: false, anisotropy: 2,  textureLevel: 1, post: [] },
  BALANCED: { dprCap: 1.5,  msaa: 4, shadowMap: 1024, hair: 'strands', hairStrands: 20000, skin: 'wrap-sss',    micro: true,  anisotropy: 4,  textureLevel: 0, post: ['tonemap', 'bloom-lite'] },
  HIGH:     { dprCap: 2,    msaa: 8, shadowMap: 2048, hair: 'strands', hairStrands: 60000, skin: 'sss-profile', micro: true,  anisotropy: 16, textureLevel: 0, post: ['tonemap', 'bloom', 'ssao', 'dof'] },
});

export const DEFAULT_POLICY = Object.freeze({
  budgetMs: 1000 / 60,        // frame time the tier must meet; 33.3 on phones
  window: 120,                // frames in the rolling window
  settleFrames: 45,           // frames ignored after a tier change while shaders compile and caches warm
  maxSampleMs: 250,           // longer frames are tab switches or loads, not load on the GPU
  downAbove: 1.15,            // step down when the window's p95 is over budget by this factor
  upBelow: 0.6,               // step up when p95 is this far under budget...
  upWindows: 3,               // ...for this many windows in a row
  upCooldownMs: 10000,
  penaltyMs: 120000,          // after a step up fails, do not try that tier again for this long
});

export function createGovernor(selected = 'AUTO', tier = 'BALANCED', policy = {}) {
  return { selected, tier: selected === 'AUTO' ? tier : selected, samples: [], settle: 0, calmWindows: 0, lastChangeAt: -Infinity, blockedUntil: {}, policy: { ...DEFAULT_POLICY, ...policy } };
}

const p95 = (values) => { const s = [...values].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))]; };

/** Feed one frame time. Returns the next state and, when the tier changes, `change: { from, to, reason }`. */
export function observe(state, frameMs, nowMs) {
  const p = state.policy;
  if (state.selected !== 'AUTO') return { state: { ...state, tier: state.selected } };           // the user's choice is never overridden
  if (frameMs > p.maxSampleMs || !(frameMs > 0)) return { state };
  if (state.settle > 0) return { state: { ...state, settle: state.settle - 1 } };

  const samples = [...state.samples, frameMs].slice(-p.window);
  if (samples.length < p.window) return { state: { ...state, samples } };

  const level = p95(samples);
  const index = TIER_ORDER.indexOf(state.tier);
  const base = { ...state, samples };

  if (level > p.budgetMs * p.downAbove && index > 0) {
    const to = TIER_ORDER[index - 1];
    const recentlyRaised = nowMs - state.lastChangeAt < 30000 && state.lastDirection === 'up';
    const blockedUntil = recentlyRaised ? { ...state.blockedUntil, [state.tier]: nowMs + p.penaltyMs } : state.blockedUntil;
    return { state: { ...base, tier: to, samples: [], settle: p.settleFrames, calmWindows: 0, lastChangeAt: nowMs, lastDirection: 'down', blockedUntil },
      change: { from: state.tier, to, reason: `p95 ${level.toFixed(1)} ms is over the ${p.budgetMs.toFixed(1)} ms budget` } };
  }

  if (level < p.budgetMs * p.upBelow && index < TIER_ORDER.length - 1) {
    const to = TIER_ORDER[index + 1];
    const calm = state.calmWindows + 1;
    const allowed = calm >= p.upWindows && nowMs - state.lastChangeAt >= p.upCooldownMs && nowMs >= (state.blockedUntil[to] ?? 0);
    if (allowed) {
      return { state: { ...base, tier: to, samples: [], settle: p.settleFrames, calmWindows: 0, lastChangeAt: nowMs, lastDirection: 'up' },
        change: { from: state.tier, to, reason: `p95 ${level.toFixed(1)} ms for ${calm} windows` } };
    }
    return { state: { ...base, samples: [], calmWindows: calm } };
  }

  return { state: { ...base, samples: [], calmWindows: 0 } };
}

/** Label for the quality control: "Automatic (HIGH)" or just "High". */
export function tierLabel(state) {
  const name = state.tier[0] + state.tier.slice(1).toLowerCase();
  return state.selected === 'AUTO' ? `Automatic (${name})` : name;
}
