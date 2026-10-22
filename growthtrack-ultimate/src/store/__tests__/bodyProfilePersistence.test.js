import { beforeEach, expect, it, vi } from 'vitest';
import useStore from '../useStore';
import { apiRequest } from '../../lib/apiClient';

vi.mock('../../lib/apiClient', () => ({ apiRequest: vi.fn() }));
vi.mock('../../lib/logger', () => ({ logCRUD: vi.fn().mockResolvedValue(undefined) }));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
beforeEach(() => {
  vi.mocked(apiRequest).mockReset();
  useStore.getState().resetSessionData();
  useStore.setState({ user: { id: 'profile-owner' }, bodyProfile: { heightCm: 175, waistCm: 82 } });
});

it.each(['resolve', 'reject'])('does not apply an old account’s body-profile %s after switching accounts', async outcome => {
  const response = deferred(); apiRequest.mockReturnValueOnce(response.promise);
  const request = useStore.getState().updateBodyProfile({ heightCm: 180 });
  const result = request.catch(() => undefined);
  await settle();
  useStore.getState().resetSessionData();
  const next = { heightCm: 165, waistCm: 70 };
  useStore.setState({ user: { id: 'next-owner' }, bodyProfile: next });
  response[outcome](outcome === 'resolve' ? { heightCm: 180, waistCm: 82 } : new Error('offline'));
  await result;
  expect(useStore.getState().bodyProfile).toBe(next);
});

it('orders writes from separate physique editors and merges their optimistic fields', async () => {
  const first = deferred();
  apiRequest.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ heightCm: 180, waistCm: 78 });
  const a = useStore.getState().updateBodyProfile({ heightCm: 180 });
  const b = useStore.getState().updateBodyProfile({ waistCm: 78 });
  await settle();
  expect(apiRequest).toHaveBeenCalledTimes(1);
  first.resolve({ heightCm: 180, waistCm: 82 });
  await Promise.all([a, b]);
  expect(apiRequest).toHaveBeenCalledTimes(2);
  expect(useStore.getState().bodyProfile).toEqual({ heightCm: 180, waistCm: 78 });
});

it('cancels queued body writes after a session replacement', async () => {
  const response = deferred(); apiRequest.mockReturnValueOnce(response.promise);
  const first = useStore.getState().updateBodyProfile({ heightCm: 180 });
  const queued = useStore.getState().updateBodyProfile({ waistCm: 78 });
  const queuedError = expect(queued).rejects.toThrow('session changed');
  await settle(); useStore.getState().resetSessionData();
  response.resolve({ heightCm: 180, waistCm: 82 });
  await first; await queuedError;
  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(useStore.getState().bodyProfile).toBeNull();
});

it.each(['resolve', 'reject'])('keeps a newer body snapshot after an older request %s', async outcome => {
  const response = deferred(); apiRequest.mockReturnValueOnce(response.promise);
  const request = useStore.getState().updateBodyProfile({ heightCm: 180 });
  const result = request.catch(() => undefined);
  await settle();
  const refreshed = { heightCm: 179, waistCm: 80 };
  useStore.setState({ bodyProfile: refreshed });
  response[outcome](outcome === 'resolve' ? { heightCm: 180, waistCm: 82 } : new Error('offline'));
  await result;
  expect(useStore.getState().bodyProfile).toBe(refreshed);
});
