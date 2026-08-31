import { beforeEach, describe, expect, it } from 'vitest';
import use3DStore, { CAMERA_PRESETS, GPU_TIERS } from '../store/use3DStore';

describe('3D store safety guards', () => {
  beforeEach(() => {
    use3DStore.setState({
      cameraPreset: 'FRONT', cameraZoom: 1, anatomyDepth: 100,
      splitDividerX: 0.5, renderMode: 'WEBGL', stressLevel: 0,
      gpuTier: GPU_TIERS.HIGH,
      timelineSnaps: [], timelineScrubIndex: null,
      ambitionPath: { ...use3DStore.getState().ambitionPath, currentMonthIndex: 0, targetMonthIndex: 0 },
    });
  });

  it('ignores invalid enum and numeric inputs', () => {
    const store = use3DStore.getState();
    store.setCameraPreset('NOT_A_PRESET');
    store.setRenderMode('VR');
    store.setGpuTier('UNKNOWN');
    store.setCameraZoom('nope');
    store.setAnatomyDepth('nope');
    store.setSplitDividerX('nope');
    store.setStressLevel('nope');
    expect(use3DStore.getState()).toMatchObject({
      cameraPreset: 'FRONT', cameraZoom: 1, anatomyDepth: 100,
      splitDividerX: 0.5, renderMode: 'WEBGL', stressLevel: 0, gpuTier: GPU_TIERS.HIGH,
    });
  });

  it('clamps valid numeric inputs and handles an empty deadline', () => {
    const store = use3DStore.getState();
    store.setCameraPreset(Object.keys(CAMERA_PRESETS)[1]);
    store.setCameraZoom(99);
    store.setAnatomyDepth(-2);
    store.setSplitDividerX(2);
    store.setStressLevel(101);
    expect(use3DStore.getState()).toMatchObject({ cameraZoom: 3.4, anatomyDepth: 0, splitDividerX: 0.95, stressLevel: 100 });
    expect(use3DStore.getState().getProgressPercent()).toBe(0);
  });

  it('never reports progress above the configured deadline', () => {
    use3DStore.setState({ ambitionPath: { ...use3DStore.getState().ambitionPath, currentMonthIndex: 4, targetMonthIndex: 3 } });
    expect(use3DStore.getState().getProgressPercent()).toBe(100);
  });

  it('keeps malformed timeline snapshots out of the render path', () => {
    const store = use3DStore.getState();
    store.setTimelineSnaps([
      null,
      { id: 'safe', date: '2026-01-01', metrics: { weight: 70 } },
      { id: 'bad', metrics: null },
    ]);
    expect(use3DStore.getState().timelineSnaps).toHaveLength(1);
    store.scrubTimeline(99);
    expect(use3DStore.getState().timelineScrubIndex).toBe(0);
    store.scrubTimeline('invalid');
    expect(use3DStore.getState().timelineScrubIndex).toBe(0);
  });
});
