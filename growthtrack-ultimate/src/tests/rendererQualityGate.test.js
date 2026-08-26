import { describe, expect, it } from 'vitest';
import { buildRendererQualityGate, QUALITY_GATE_STATUS } from '../lib/rendererQualityGate';

const healthyInput = {
  diagnostics: {
    activeRenderer: 'procedural-production',
    health: 'needs-repair',
    missingMorphTargets: Array(30).fill('missing'),
  },
  telemetry: {
    status: 'ready',
    contextLost: false,
    frames: 120,
    fps: 58,
    frameTimeP95: 18,
    accessibleName: true,
    reducedMotionSupported: true,
    visibilityPauseSupported: true,
    intersectionPauseSupported: true,
  },
  renderMode: 'WEBGL',
  gpuTier: 'MED',
  cinematicState: { sceneEnvironment: 'studio', exposure: 1.08 },
  settingsPersisted: true,
};

describe('renderer quality gate', () => {
  it('accepts the production procedural renderer without hiding the GLB advisory', () => {
    const gate = buildRendererQualityGate(healthyInput);
    expect(gate.releaseReady).toBe(true);
    expect(gate.status).toBe(QUALITY_GATE_STATUS.WARN);
    expect(gate.checks.find((item) => item.id === 'model')?.status).toBe(QUALITY_GATE_STATUS.PASS);
    expect(gate.checks.find((item) => item.id === 'asset-upgrade')?.status).toBe(QUALITY_GATE_STATUS.WARN);
  });

  it('blocks release when the WebGL context is lost', () => {
    const gate = buildRendererQualityGate({
      ...healthyInput,
      telemetry: { ...healthyInput.telemetry, status: 'context-lost', contextLost: true },
    });
    expect(gate.releaseReady).toBe(false);
    expect(gate.status).toBe(QUALITY_GATE_STATUS.FAIL);
  });

  it('blocks unsupported cinematic values', () => {
    const gate = buildRendererQualityGate({
      ...healthyInput,
      cinematicState: { sceneEnvironment: 'invalid', exposure: 3 },
    });
    expect(gate.releaseReady).toBe(false);
    expect(gate.checks.find((item) => item.id === 'cinematic')?.status).toBe(QUALITY_GATE_STATUS.FAIL);
  });

  it('keeps slow frame samples non-blocking because adaptive quality can recover', () => {
    const gate = buildRendererQualityGate({
      ...healthyInput,
      telemetry: { ...healthyInput.telemetry, fps: 24, frameTimeP95: 48 },
    });
    expect(gate.releaseReady).toBe(true);
    expect(gate.checks.find((item) => item.id === 'performance')?.status).toBe(QUALITY_GATE_STATUS.WARN);
  });
});

