import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('ApiClient', () => {
  it('aborts a hung read at its deadline and releases its timer', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')), { once: true });
    })));
    const pending = new ApiClient({ baseUrl: '', timeoutMs: 50, retries: 0 }).get('/api/state');
    const result = expect(pending).rejects.toMatchObject({ status: 408 });
    await vi.advanceTimersByTimeAsync(50);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('recovers a transient read failure with one bounded retry', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response('{}', { status: 503 })).mockResolvedValueOnce(new Response('{"recovered":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const pending = new ApiClient({ baseUrl: '', retries: 1 }).get('/api/state');
    const result = expect(pending).resolves.toEqual({ recovered: true });
    await vi.runAllTimersAsync();
    await result;
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not replay a mutation after a lost connection', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Disconnected'));
    vi.stubGlobal('fetch', fetchMock);
    await expect(new ApiClient({ baseUrl: '', retries: 3 }).post('/api/tasks', { title: 'Fictional task' })).rejects.toMatchObject({ status: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not send a request cancelled by navigation', async () => {
    const controller = new AbortController(); controller.abort();
    const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
    await expect(new ApiClient({ baseUrl: '' }).get('/api/state', { signal: controller.signal })).rejects.toMatchObject({ name: 'ApiError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('asks for JSON so content-negotiated endpoints such as /api/health do not answer with HTML', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"status":"online"}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(new ApiClient({ baseUrl: '' }).request('/api/health')).resolves.toEqual({ status: 'online' });
    expect(fetchMock.mock.calls[0][1].headers.get('Accept')).toBe('application/json');
  });

  it('keeps an Accept header the caller sets', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await new ApiClient({ baseUrl: '' }).request('/api/export', { headers: { Accept: 'text/csv' } });
    expect(fetchMock.mock.calls[0][1].headers.get('Accept')).toBe('text/csv');
  });

  it('rejects a 200 response whose body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<!DOCTYPE html>', { status: 200 })));
    await expect(new ApiClient({ baseUrl: '', retries: 0 }).request('/api/health')).rejects.toMatchObject({ name: 'ApiError', status: 200 });
  });
});
