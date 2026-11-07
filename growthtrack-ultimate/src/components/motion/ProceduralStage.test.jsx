import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ProceduralStage from './ProceduralStage';
import useSceneMotion from '../../hooks/useSceneMotion';

const spies = vi.hoisted(() => ({ create: vi.fn(), active: vi.fn(), state: vi.fn(), dispose: vi.fn() }));
vi.mock('../../hooks/useSceneMotion', () => ({ default: vi.fn() }));
vi.mock('./KineticContext', () => ({ useKinetic: () => ({ tier: 2 }) }));
vi.mock('./scenes/livingAtlas', () => ({ createScene: (...args) => spies.create(...args) }));
beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); useSceneMotion.mockReturnValue(true); spies.create.mockReturnValue({ setActive: spies.active, setState: spies.state, dispose: spies.dispose }); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
const settle = async () => { await act(async () => { await vi.advanceTimersByTimeAsync(150); await vi.dynamicImportSettled(); }); };
it('defers the renderer, freezes it on pause, changes state and disposes on unmount', async () => {
  const view = render(<ProceduralStage kind="atlas" state="gather"><svg data-testid="poster" /></ProceduralStage>);
  expect(spies.create).not.toHaveBeenCalled();
  expect(view.container.firstChild).toHaveAttribute('data-renderer', 'poster');
  await settle(); expect(spies.create).toHaveBeenCalledTimes(1);
  expect(view.container.firstChild).toHaveAttribute('data-renderer', 'ready');
  view.rerender(<ProceduralStage kind="atlas" state="grow"><svg /></ProceduralStage>);
  expect(spies.state).toHaveBeenLastCalledWith('grow');
  useSceneMotion.mockReturnValue(false); view.rerender(<ProceduralStage kind="atlas" state="grow"><svg /></ProceduralStage>);
  expect(spies.active).toHaveBeenLastCalledWith(false); expect(spies.dispose).not.toHaveBeenCalled();
  view.unmount(); expect(spies.dispose).toHaveBeenCalledTimes(1);
});
it('does not create a late renderer after unmount or when motion starts disabled', async () => {
  useSceneMotion.mockReturnValue(false);
  const view = render(<ProceduralStage kind="atlas"><svg /></ProceduralStage>);
  await settle(); expect(spies.create).not.toHaveBeenCalled();
  useSceneMotion.mockReturnValue(true); view.rerender(<ProceduralStage kind="atlas"><svg /></ProceduralStage>);
  view.unmount(); await settle(); expect(spies.create).not.toHaveBeenCalled();
});
it('keeps static art when WebGL fails and does not retry on every pose change', async () => {
  spies.create.mockImplementation(() => { throw Error('Synthetic unavailable WebGL'); });
  const view = render(<ProceduralStage kind="atlas"><svg /></ProceduralStage>);
  await settle(); expect(view.container.firstChild).toHaveAttribute('data-renderer', 'fallback');
  expect(view.container.querySelector('svg')).toBeVisible();
  view.rerender(<ProceduralStage kind="atlas" state="grow"><svg /></ProceduralStage>);
  await settle(); expect(spies.create).toHaveBeenCalledTimes(1);
});
