import { beforeEach, describe, expect, it } from 'vitest';

import use3DStore, { CINEMATIC_DEFAULTS } from '../store/use3DStore';

describe('cinematic renderer state', () => {
  beforeEach(() => {
    use3DStore.getState().setCinematicState(CINEMATIC_DEFAULTS);
  });

  it('applies a complete cinematic preset atomically', () => {
    use3DStore.getState().applyCinematicPreset('NEON');
    const state = use3DStore.getState().cinematicState;

    expect(state.preset).toBe('NEON');
    expect(state.sceneEnvironment).toBe('night');
    expect(state.chromaticAberration).toBe(true);
    expect(state.bloom).toBe(true);
  });

  it('sanitizes hydrated renderer settings', () => {
    use3DStore.getState().setCinematicState({
      sceneEnvironment: 'unknown',
      exposure: 9,
      bloom: 0,
    });
    const state = use3DStore.getState().cinematicState;

    expect(state.sceneEnvironment).toBe('studio');
    expect(state.exposure).toBe(1.35);
    expect(state.bloom).toBe(false);
  });

  it('marks hand-tuned settings as a custom grade', () => {
    use3DStore.getState().setCinematicSetting('vignette', false);
    const state = use3DStore.getState().cinematicState;

    expect(state.preset).toBe('CUSTOM');
    expect(state.vignette).toBe(false);
  });
});
