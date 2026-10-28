import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DemandRendering from './DemandRendering';
import { AVATAR_SPEECH_EVENT } from './avatarSpeech';

const model = vi.hoisted(() => ({ frame: null, state: {}, canvas: null, listeners: new Set(), invalidate: vi.fn() }));
vi.mock('@react-three/fiber', () => ({
  useThree: selector => selector({ invalidate: model.invalidate, gl: { domElement: model.canvas } }),
  useFrame: callback => { model.frame = callback; },
}));
vi.mock('../../store/use3DStore', () => ({ default: {
  getState: () => model.state,
  subscribe: callback => { model.listeners.add(callback); return () => model.listeners.delete(callback); },
} }));
beforeEach(() => {
  model.canvas = document.createElement('canvas');
  model.state = { avatarWorkspace: { inspectorOpen: true, inspectorSection: 'measurements', naturalMotion: true, showStage: true, lightingMode: 'neutral' }, animationState: { animationId: 'idle', playing: true }, viewMode: 'SOLO' };
  model.invalidate.mockClear();
  vi.spyOn(performance, 'now').mockReturnValue(0);
});
afterEach(() => { cleanup(); model.listeners.clear(); vi.restoreAllMocks(); });
const frame = () => model.frame({ gl: { domElement: model.canvas } });
const change = patch => {
  const previous = model.state;
  model.state = { ...previous, ...patch };
  model.listeners.forEach(listener => listener(model.state, previous));
};

describe('demand render scheduling', () => {
  it('stops requesting frames once the scene settles and telemetry cannot restart it', () => {
    render(<DemandRendering active reducedMotion={false} />);
    model.invalidate.mockClear();
    performance.now.mockReturnValue(2000);
    frame();
    expect(model.canvas.dataset.renderLoop).toBe('idle');
    expect(model.invalidate).not.toHaveBeenCalled();
    change({ rendererQualityTelemetry: { fps: 60 } });
    expect(model.invalidate).not.toHaveBeenCalled();
    change({ cameraRevision: 1 });
    expect(model.invalidate).toHaveBeenCalledOnce();
    model.invalidate.mockClear();
    frame();
    expect(model.canvas.dataset.renderLoop).toBe('settling');
    expect(model.invalidate).toHaveBeenCalledOnce();
  });
  it('preserves live animation and wakes for protected captures and speech', () => {
    render(<DemandRendering active reducedMotion={false} />);
    performance.now.mockReturnValue(4000);
    change({ avatarWorkspace: {...model.state.avatarWorkspace,inspectorSection:'pose'}, animationState: { animationId: 'walk', playing: true } });
    model.invalidate.mockClear();
    frame();
    expect(model.canvas.dataset.renderLoop).toBe('animated');
    expect(model.invalidate).toHaveBeenCalledOnce();
    model.invalidate.mockClear();
    change({ captureRedacted: true });
    expect(model.invalidate).toHaveBeenCalledOnce();
    model.canvas.dispatchEvent(new Event(AVATAR_SPEECH_EVENT));
    expect(model.invalidate).toHaveBeenCalledTimes(2);
  });
  it('does not request continuous frames while the scene is hidden and unsubscribes on exit', () => {
    model.state = { ...model.state, autoRotate: true };
    const { unmount } = render(<DemandRendering active={false} reducedMotion={false} />);
    frame();
    expect(model.invalidate).not.toHaveBeenCalled();
    unmount();
    expect(model.listeners.size).toBe(0);
    model.canvas.dispatchEvent(new Event(AVATAR_SPEECH_EVENT));
    expect(model.invalidate).not.toHaveBeenCalled();
  });
});
