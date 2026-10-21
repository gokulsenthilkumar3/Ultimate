import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import useAvatarPresentation from './useAvatarPresentation';
import useStore from '../store/useStore';
import use3DStore from '../store/use3DStore';
import { apiRequest } from '../lib/apiClient';

vi.mock('../lib/apiClient', () => ({ apiRequest:vi.fn() }));
vi.mock('../lib/logger', () => ({ logCRUD:vi.fn().mockResolvedValue(undefined) }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(apiRequest).mockReset().mockResolvedValue({});
  useStore.getState().resetSessionData();
  useStore.setState({ user:{ id:'layout-owner' },physiqueTargets:{ goalMetrics:{ waist:80 } } });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
const tick = async () => act(async () => { await vi.advanceTimersByTimeAsync(400); });

it('coalesces edits and merges preferences with the latest targets at save time', async () => {
  const { result } = renderHook(() => useAvatarPresentation());
  act(() => { result.current.change({density:'compact'}); result.current.change({inspectorWidth:480}); });
  act(() => useStore.setState({ physiqueTargets:{ goalMetrics:{waist:78},renderSettings:{vignette:false} } }));
  expect(use3DStore.getState().avatarWorkspace.inspectorWidth).toBe(480);
  await tick();
  expect(apiRequest).toHaveBeenCalledTimes(1);
  const [path,request] = vi.mocked(apiRequest).mock.calls[0];
  expect(path).toBe('/api/physique_targets');
  expect(JSON.parse(request.body)).toMatchObject({ goalMetrics:{waist:78},renderSettings:{vignette:false},viewerPreferences:{density:'compact',inspectorWidth:480} });
  expect(result.current.saveStatus).toBe('saved');
});

it('keeps a failed preview visible and retries on the next edit', async () => {
  vi.mocked(apiRequest).mockRejectedValueOnce(new Error('offline'));
  const { result } = renderHook(() => useAvatarPresentation());
  act(() => result.current.change({density:'compact'}));
  await tick();
  expect(result.current.saveStatus).toBe('error');
  expect(use3DStore.getState().avatarWorkspace.density).toBe('compact');
  act(() => result.current.change({guideDetail:'concise'}));
  await tick();
  expect(result.current.saveStatus).toBe('saved');
  expect(useStore.getState().physiqueTargets.viewerPreferences).toMatchObject({density:'compact',guideDetail:'concise'});
});

it('cancels an old owner’s unsaved layout when accounts change', async () => {
  const { result } = renderHook(() => useAvatarPresentation());
  act(() => result.current.change({density:'compact'}));
  act(() => useStore.setState({ user:{id:'other-owner'},physiqueTargets:{} }));
  await tick();
  expect(apiRequest).not.toHaveBeenCalled();
  expect(use3DStore.getState().avatarWorkspace.density).toBe('comfortable');
  expect(result.current.saveStatus).toBe('default');
});

it('flushes pending layout edits when leaving the workspace', async () => {
  const { result,unmount } = renderHook(() => useAvatarPresentation());
  act(() => result.current.change({interfaceEffects:false}));
  unmount();
  await tick();
  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(useStore.getState().physiqueTargets.viewerPreferences.interfaceEffects).toBe(false);
});
