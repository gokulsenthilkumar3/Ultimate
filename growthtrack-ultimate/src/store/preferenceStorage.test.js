import { expect, it, vi } from 'vitest';
import { createPreferenceStorage } from './preferenceStorage';

function fixture() {
  const data = new Map();
  const storage = {
    getItem: vi.fn(name => data.get(name) ?? null),
    setItem: vi.fn((name, value) => data.set(name, value)),
    removeItem: vi.fn(name => data.delete(name)),
  };
  return { data, storage, cached: createPreferenceStorage(storage) };
}

it('skips serialization only while the persisted fields and version are unchanged', () => {
  const { storage, cached } = fixture();
  const serialize = vi.fn(() => ({ id: 'synthetic' }));
  const portfolio = [{ toJSON: serialize }];
  const snapshot = { version: 4, state: { theme: 'light', portfolio } };
  cached.setItem('prefs', snapshot);
  cached.setItem('prefs', { ...snapshot, state: { ...snapshot.state } });
  expect(serialize).toHaveBeenCalledTimes(1);
  expect(storage.setItem).toHaveBeenCalledTimes(1);
  cached.setItem('prefs', { ...snapshot, state: { ...snapshot.state, theme: 'dark' } });
  expect(storage.setItem).toHaveBeenCalledTimes(2);
  cached.setItem('prefs', { version: 5, state: { ...snapshot.state, theme: 'dark' } });
  expect(storage.setItem).toHaveBeenCalledTimes(3);
  cached.setItem('prefs', { version: 5, state: { theme: 'dark', portfolio: [...portfolio] } });
  expect(storage.setItem).toHaveBeenCalledTimes(4);
});

it('invalidates the cache on reads and removal, and keeps keys independent', () => {
  const { data, storage, cached } = fixture();
  const snapshot = { version: 4, state: { theme: 'light' } };
  cached.setItem('one', snapshot);
  cached.setItem('two', snapshot);
  cached.getItem('one');
  cached.setItem('one', snapshot);
  expect(storage.setItem).toHaveBeenCalledTimes(3);
  cached.removeItem('one');
  expect(data.has('one')).toBe(false);
  cached.setItem('one', snapshot);
  expect(data.has('one')).toBe(true);
  cached.setItem('two', snapshot);
  expect(storage.setItem).toHaveBeenCalledTimes(4);
});

it('retries a failed storage write instead of caching an unacknowledged value', () => {
  const { storage, cached } = fixture();
  const snapshot = { version: 4, state: { theme: 'light' } };
  storage.setItem.mockImplementationOnce(() => { throw new Error('Storage full'); });
  expect(() => cached.setItem('prefs', snapshot)).toThrow('Storage full');
  cached.setItem('prefs', snapshot);
  expect(storage.setItem).toHaveBeenCalledTimes(2);
});
