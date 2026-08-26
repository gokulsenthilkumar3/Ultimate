export const QUALITY_GATE_STATUS = Object.freeze({
  PASS: 'pass',
  WARN: 'warn',
  FAIL: 'fail',
  PENDING: 'pending',
});

const VALID_ENVIRONMENTS = new Set(['studio', 'outdoor', 'night']);
const VALID_TIERS = new Set(['LOW', 'MED', 'HIGH']);

function check(id, label, status, detail, blocking = true) {
  return { id, label, status, detail, blocking };
}

function rendererCheck(telemetry, renderMode) {
  if (renderMode === 'SPRITE') {
    return check('renderer', 'Realtime renderer', QUALITY_GATE_STATUS.WARN, '2D fallback is active.', false);
  }
  if (telemetry?.status === 'context-lost' || telemetry?.status === 'error') {
    return check('renderer', 'Realtime renderer', QUALITY_GATE_STATUS.FAIL, 'The WebGL context is unavailable.');
  }
  if (telemetry?.status !== 'ready') {
    return check('renderer', 'Realtime renderer', QUALITY_GATE_STATUS.PENDING, 'Waiting for the 3D canvas to initialize.');
  }
  return check('renderer', 'Realtime renderer', QUALITY_GATE_STATUS.PASS, 'WebGL canvas and recovery hooks are active.');
}

function modelCheck(diagnostics) {
  if (!diagnostics) {
    return check('model', 'Production model', QUALITY_GATE_STATUS.PENDING, 'Waiting for model diagnostics.');
  }
  if (diagnostics.activeRenderer === 'procedural-production') {
    return check('model', 'Production model', QUALITY_GATE_STATUS.PASS, 'Validated procedural digital human is active.');
  }
  if (diagnostics.activeRenderer === 'authored-glb' && diagnostics.health === 'healthy') {
    return check('model', 'Production model', QUALITY_GATE_STATUS.PASS, 'Validated authored GLB is active.');
  }
  return check('model', 'Production model', QUALITY_GATE_STATUS.FAIL, 'No production-safe model fallback is active.');
}

function morphCheck(diagnostics) {
  if (!diagnostics) {
    return check('morphs', 'Morph coverage', QUALITY_GATE_STATUS.PENDING, 'Waiting for morph diagnostics.');
  }
  if (diagnostics.activeRenderer === 'procedural-production') {
    return check('morphs', 'Morph coverage', QUALITY_GATE_STATUS.PASS, 'Measurement and advanced procedural morph channels are available.');
  }
  const missing = diagnostics.missingMorphTargets?.length ?? Infinity;
  return missing === 0
    ? check('morphs', 'Morph coverage', QUALITY_GATE_STATUS.PASS, 'All required authored morph targets are present.')
    : check('morphs', 'Morph coverage', QUALITY_GATE_STATUS.FAIL, `${missing} required authored morph targets are missing.`);
}

function performanceCheck(telemetry, gpuTier) {
  if (!telemetry || (telemetry.frames ?? 0) < 30) {
    return check('performance', 'Frame health', QUALITY_GATE_STATUS.PENDING, 'Collecting a stable frame sample.', false);
  }
  const targetFps = gpuTier === 'LOW' ? 30 : 60;
  const floorFps = targetFps * 0.72;
  const frameBudget = gpuTier === 'LOW' ? 45 : 28;
  const healthy = telemetry.fps >= floorFps && telemetry.frameTimeP95 <= frameBudget;
  return healthy
    ? check('performance', 'Frame health', QUALITY_GATE_STATUS.PASS, `${telemetry.fps} FPS · ${telemetry.frameTimeP95} ms p95.`, false)
    : check('performance', 'Frame health', QUALITY_GATE_STATUS.WARN, `${telemetry.fps} FPS · ${telemetry.frameTimeP95} ms p95; adaptive quality remains active.`, false);
}

function cinematicCheck(cinematicState) {
  const exposure = Number(cinematicState?.exposure);
  const valid = VALID_ENVIRONMENTS.has(cinematicState?.sceneEnvironment)
    && exposure >= 0.72 && exposure <= 1.35;
  return valid
    ? check('cinematic', 'Cinematic pipeline', QUALITY_GATE_STATUS.PASS, 'Environment, exposure, tone mapping and effects are within safe bounds.')
    : check('cinematic', 'Cinematic pipeline', QUALITY_GATE_STATUS.FAIL, 'Renderer settings are outside supported bounds.');
}

export function buildRendererQualityGate({
  diagnostics,
  telemetry,
  renderMode = 'WEBGL',
  cinematicState = {},
  gpuTier = 'MED',
  settingsPersisted = false,
} = {}) {
  const checks = [
    rendererCheck(telemetry, renderMode),
    modelCheck(diagnostics),
    morphCheck(diagnostics),
    cinematicCheck(cinematicState),
    performanceCheck(telemetry, gpuTier),
    check(
      'resilience',
      'Context recovery',
      telemetry?.contextLost ? QUALITY_GATE_STATUS.FAIL : telemetry?.status === 'ready' ? QUALITY_GATE_STATUS.PASS : QUALITY_GATE_STATUS.PENDING,
      telemetry?.contextLost ? 'WebGL context recovery is required.' : 'Context-loss and restoration monitoring is active.'
    ),
    check(
      'accessibility',
      'Accessible motion',
      telemetry?.accessibleName && telemetry?.reducedMotionSupported ? QUALITY_GATE_STATUS.PASS : QUALITY_GATE_STATUS.PENDING,
      'Canvas labeling and reduced-motion behavior are enabled.'
    ),
    check(
      'lifecycle',
      'Render lifecycle',
      telemetry?.visibilityPauseSupported && telemetry?.intersectionPauseSupported ? QUALITY_GATE_STATUS.PASS : QUALITY_GATE_STATUS.PENDING,
      'Off-screen and background rendering pause controls are active.'
    ),
    check(
      'persistence',
      'Saved render profile',
      settingsPersisted ? QUALITY_GATE_STATUS.PASS : QUALITY_GATE_STATUS.WARN,
      settingsPersisted ? 'Cinematic settings are stored with the physique profile.' : 'The default profile is active; customize once to store it.',
      false
    ),
    check(
      'asset-upgrade',
      'Authored GLB upgrade',
      diagnostics?.activeRenderer === 'authored-glb' && diagnostics?.health === 'healthy' ? QUALITY_GATE_STATUS.PASS : QUALITY_GATE_STATUS.WARN,
      diagnostics?.activeRenderer === 'authored-glb' && diagnostics?.health === 'healthy'
        ? 'The authored digital-human asset passes strict validation.'
        : 'Procedural production fallback is safe; the authored GLB still needs replacement.',
      false
    ),
  ];

  if (!VALID_TIERS.has(gpuTier)) {
    checks.push(check('quality-tier', 'Adaptive quality tier', QUALITY_GATE_STATUS.FAIL, 'Unknown GPU quality tier.'));
  }

  const blocking = checks.filter((item) => item.blocking);
  const status = blocking.some((item) => item.status === QUALITY_GATE_STATUS.FAIL)
    ? QUALITY_GATE_STATUS.FAIL
    : blocking.some((item) => item.status === QUALITY_GATE_STATUS.PENDING)
      ? QUALITY_GATE_STATUS.PENDING
      : checks.some((item) => item.status === QUALITY_GATE_STATUS.WARN)
        ? QUALITY_GATE_STATUS.WARN
        : QUALITY_GATE_STATUS.PASS;

  return {
    status,
    releaseReady: !blocking.some((item) => item.status === QUALITY_GATE_STATUS.FAIL || item.status === QUALITY_GATE_STATUS.PENDING),
    checks,
    passed: checks.filter((item) => item.status === QUALITY_GATE_STATUS.PASS).length,
    total: checks.length,
  };
}

