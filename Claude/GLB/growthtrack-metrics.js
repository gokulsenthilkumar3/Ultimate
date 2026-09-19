/*
 * growthtrack-metrics.js  -  app metrics  ->  morph-target weights for humanoid-base(.lite).glb
 *
 * Dependency-free (browser, three.js/R3F, Node).
 *
 *   const cal = GrowthTrackMetrics.calibrationFromGLTF(gltf);        // read from GLB extras.metricMapping
 *   const res = GrowthTrackMetrics.solve(cal, { heightCm:178, weightKg:82, waistCm:92, bicepCm:35 });
 *   GrowthTrackMetrics.applyMorphs(gltf.scene, res.weights);         // sets influences on body, hair, eyes by name
 *   avatarGroup.scale.setScalar(res.cmPerUnit / 100);                // mesh units -> metres (optional)
 *
 * All metric keys are optional. Provide any subset:
 *   heightCm, weightKg, bodyFatPct,
 *   neckCm, chestCm, waistCm, hipsCm, shouldersCm (bideltoid width), bicepCm, forearmCm, thighCm, calfCm
 *
 * Explicit circumferences win. Missing ones are estimated from BMI (and body-fat %) using the
 * population regressions in REGRESSION below, with lower confidence. Tune them for your users.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GrowthTrackMetrics = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // measure key in calibration  <-  metric key in the app
  const METRIC_TO_MEASURE = {
    neckCm: 'neck', chestCm: 'chest', waistCm: 'waist', hipsCm: 'hips', shouldersCm: 'shoulders_w',
    bicepCm: 'bicep', forearmCm: 'forearm', thighCm: 'thigh', calfCm: 'calf'
  };

  // Approximate adult-male slopes: cm of circumference per +1 BMI (tune for your audience).
  // Estimates are RELATIVE to the neutral avatar, which is assumed to sit at REF_BMI.
  const REGRESSION = { neck: 0.56, chest: 1.75, waist: 2.5, hips: 1.5, thigh: 0.9, bicep: 0.6, calf: 0.44, forearm: 0.37 };
  const REF_BMI = 21;
  // Plausible human range per measurement (cm). Requests outside are clamped and reported.
  const LIMITS_CM = { neck: [30, 50], chest: [70, 122], waist: [60, 115], hips: [80, 125], shoulders_w: [42, 64],
                      bicep: [20, 34], forearm: [20, 32], thigh: [42, 68], calf: [29, 48] };

  const SIGMA_EXPLICIT = 1.0;   // cm  - trust in user-entered measurements
  const SIGMA_ESTIMATE = 4.0;   // cm  - trust in BMI-derived guesses
  const LAMBDA = 0.02;          // ridge strength: prefer small weights when several morphs can do the job
  const HEIGHT_DRIVERS = ['torso_length', 'leg_length'];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function calibrationFromGLTF(gltf) {
    const j = (gltf.parser && gltf.parser.json) || gltf.json || gltf;
    const cal = j && j.extras && j.extras.metricMapping;
    if (!cal) throw new Error('GLB has no extras.metricMapping');
    return cal;
  }

  function solve(cal, metrics, opts) {
    opts = opts || {};
    const baseH = opts.baseHeightCm || cal.default_base_height_cm;   // physical stature of the neutral mesh
    const cmPerUnit = baseH / cal.stature_units;                     // mesh units -> cm (constant)
    const D = cal.drivers, N = cal.neutral;
    const weights = {}, notes = [];

    // ---- BMI ---------------------------------------------------------------------------
    const bmi = (metrics.weightKg && metrics.heightCm)
      ? metrics.weightKg / Math.pow(metrics.heightCm / 100, 2) : null;

    // ---- stage 1: height (torso + legs share the change equally, in weight units) --------
    let heightCm = baseH;
    if (metrics.heightCm) {
      const jt = D.torso_length.jac.height * cmPerUnit, jl = D.leg_length.jac.height * cmPerUnit;
      const w = (metrics.heightCm - baseH) / (jt + jl);
      weights.torso_length = clamp(w, D.torso_length.min, D.torso_length.max);
      weights.leg_length = clamp(w, D.leg_length.min, D.leg_length.max);
      heightCm = baseH + jt * weights.torso_length + jl * weights.leg_length;
      if (Math.abs(heightCm - metrics.heightCm) > 0.5) notes.push('height clamped to ' + heightCm.toFixed(1) + ' cm');
    }

    // ---- stage 2: circumferences ---------------------------------------------------------
    const targets = {};    // measure -> {cm, sigma}
    for (const key in METRIC_TO_MEASURE) {
      if (metrics[key] != null) targets[METRIC_TO_MEASURE[key]] = { cm: metrics[key], sigma: SIGMA_EXPLICIT };
    }
    if (bmi != null) {
      for (const m in REGRESSION) {
        if (targets[m]) continue;
        let cm = N[m] * cmPerUnit + REGRESSION[m] * (bmi - (opts.refBmi || REF_BMI));
        if (m === 'waist' && metrics.bodyFatPct != null) cm += 0.7 * (metrics.bodyFatPct - (1.2 * bmi - 9.3));
        targets[m] = { cm: cm, sigma: SIGMA_ESTIMATE };
      }
    } else if (metrics.bodyFatPct != null && !targets.waist) {
      targets.waist = { cm: N.waist * cmPerUnit + 0.7 * (metrics.bodyFatPct - 16), sigma: SIGMA_ESTIMATE };
    }
    for (const m in targets) {                       // plausibility clamp
      const L = LIMITS_CM[m]; if (!L) continue;
      const c = clamp(targets[m].cm, L[0], L[1]);
      if (c !== targets[m].cm) { notes.push(m + ' request ' + targets[m].cm.toFixed(0) + ' cm limited to ' + c + ' cm'); targets[m].cm = c; }
    }

    const free = Object.keys(D).filter(n => HEIGHT_DRIVERS.indexOf(n) < 0 && n !== 'face_roundness');
    const measures = Object.keys(targets);
    const jc = (n, m) => ((D[n].jac[m] || 0) * cmPerUnit);          // cm per weight
    const fixedOffset = {};                                          // contribution of the height stage
    cal.measures.forEach(m => {
      fixedOffset[m] = HEIGHT_DRIVERS.reduce((s, n) => s + jc(n, m) * (weights[n] || 0), 0);
    });
    const goal = {};
    measures.forEach(m => { goal[m] = targets[m].cm - N[m] * cmPerUnit - fixedOffset[m]; });

    const w = {}; free.forEach(n => { w[n] = 0; });
    const scale = {}; free.forEach(n => { scale[n] = Math.max(Math.abs(D[n].min), Math.abs(D[n].max)); });
    const pred = m => free.reduce((s, n) => s + jc(n, m) * w[n], 0);

    for (let sweep = 0; sweep < 400; sweep++) {           // projected coordinate descent
      let maxStep = 0;
      for (const n of free) {
        let num = 0, den = LAMBDA / (scale[n] * scale[n]);
        for (const m of measures) {
          const a = jc(n, m); if (!a) continue;
          const s2 = targets[m].sigma * targets[m].sigma;
          const resid = goal[m] - (pred(m) - a * w[n]);   // target excluding this driver's own contribution
          num += a * resid / s2; den += a * a / s2;
        }
        const nv = clamp(num / den, D[n].min, D[n].max);
        maxStep = Math.max(maxStep, Math.abs(nv - w[n])); w[n] = nv;
      }
      if (maxStep < 1e-6) break;
    }
    free.forEach(n => { if (Math.abs(w[n]) > 1e-4) weights[n] = w[n]; });

    // ---- soft face fullness from adiposity ---------------------------------------------
    const fat = metrics.bodyFatPct != null ? (metrics.bodyFatPct - 16) / 8 : (bmi != null ? (bmi - 22) / 4 : null);
    if (fat != null) weights.face_roundness = clamp(fat, D.face_roundness.min, D.face_roundness.max);

    // ---- report -------------------------------------------------------------------------
    const achieved = { heightCm: heightCm }, residual = {}, atLimit = [];
    Object.keys(METRIC_TO_MEASURE).forEach(key => {
      const m = METRIC_TO_MEASURE[key];
      achieved[key] = N[m] * cmPerUnit + fixedOffset[m] + pred(m);
      if (metrics[key] != null) residual[key] = achieved[key] - metrics[key];
    });
    free.forEach(n => {
      if (w[n] >= D[n].max - 1e-3 || w[n] <= D[n].min + 1e-3) atLimit.push(n);
    });
    if (atLimit.length) notes.push('at avatar limit: ' + atLimit.join(', '));

    return { weights: weights, achieved: achieved, residual: residual, atLimit: atLimit,
             bmi: bmi, cmPerUnit: cmPerUnit, notes: notes };
  }

  // three.js: set influences by name on every mesh that has the target (body, hair, eyes).
  function applyMorphs(rootObject, weights, zeroOthers) {
    rootObject.traverse(function (o) {
      if (!o.morphTargetDictionary || !o.morphTargetInfluences) return;
      const dict = o.morphTargetDictionary;
      for (const name in dict) {
        if (weights[name] !== undefined) o.morphTargetInfluences[dict[name]] = weights[name];
        else if (zeroOthers) o.morphTargetInfluences[dict[name]] = 0;
      }
    });
  }

  return { solve: solve, applyMorphs: applyMorphs, calibrationFromGLTF: calibrationFromGLTF,
           METRIC_TO_MEASURE: METRIC_TO_MEASURE, REGRESSION: REGRESSION, LIMITS_CM: LIMITS_CM };
});
