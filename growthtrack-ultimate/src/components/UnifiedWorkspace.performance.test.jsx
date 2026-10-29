import React from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import UnifiedWorkspace from './UnifiedWorkspace';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const renderHost = () => render(<MemoryRouter><UnifiedWorkspace defaultApp="equity" /></MemoryRouter>);

describe('companion frame admission', () => {
  it('does not load a frame while readiness is pending, or after an unavailable response', async () => {
    let complete;
    const fetch = vi.fn(() => new Promise(resolve => { complete = resolve; }));
    vi.stubGlobal('fetch', fetch);
    const view = renderHost();
    expect(view.container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('heading', { name: /^Checking/ })).toBeInTheDocument();
    await act(async () => complete({ ok: false }));
    expect(view.container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('link', { name: /^Open separate/ })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps an explicitly offline product out of the frame', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ services: [{ id: 'equity', online: false }] }) }));
    const view = renderHost();
    await screen.findByRole('heading', { name: /starting or unavailable/ });
    expect(view.container.querySelector('iframe')).toBeNull();
  });

  it('requires a boolean online acknowledgement before admitting a frame', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ services: [{ id: 'equity', online: 'false' }] }) }));
    const view = renderHost();
    await screen.findByRole('heading', { name: /starting or unavailable/ });
    expect(view.container.querySelector('iframe')).toBeNull();
  });

  it('does not remount an online frame when a background probe fails', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({ services: [{ id: 'equity', online: true }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ services: [] }) }).mockRejectedValue(new Error('Temporary health failure'));
    vi.stubGlobal('fetch', fetch);
    let view;
    await act(async () => { view = renderHost(); });
    const frame = view.container.querySelector('iframe');
    expect(frame).not.toBeNull();
    expect(frame).toHaveAttribute('title', expect.stringContaining('app'));
    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(view.container.querySelector('iframe')).toBe(frame);
    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(view.container.querySelector('iframe')).toBe(frame);
    expect(screen.getByText('Service status is unavailable. Ultimate routes remain usable.')).toBeInTheDocument();
  });
});
