import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from './apiClient';

afterEach(() => vi.unstubAllGlobals());

describe('ApiClient', () => {
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
