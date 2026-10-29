import React, { Suspense } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import lazyPage from './lazyPage';

afterEach(cleanup);

it('shares an in-flight preload with rendering instead of requesting the page twice', async () => {
  let resolve;
  const load = vi.fn(() => new Promise(done => { resolve = done; }));
  const Page = lazyPage(load);
  const pending = Page.preload();
  expect(Page.preload()).toBe(pending);
  render(<Suspense fallback={<p>Loading page</p>}><Page /></Suspense>);
  await act(async () => { await Promise.resolve(); resolve({ default: () => <h1>Loaded page</h1> }); await pending; });
  expect(screen.getByRole('heading', { name: 'Loaded page' })).toBeVisible();
  expect(load).toHaveBeenCalledTimes(1);
});

it('retries a failed speculative import when the route renders', async () => {
  const load = vi.fn().mockRejectedValueOnce(new Error('Temporarily offline'))
    .mockResolvedValue({ default: () => <h1>Recovered page</h1> });
  const Page = lazyPage(load);
  await expect(Page.preload()).rejects.toThrow('Temporarily offline');
  await act(async () => { render(<Suspense fallback={<p>Loading page</p>}><Page /></Suspense>); });
  expect(screen.getByRole('heading', { name: 'Recovered page' })).toBeVisible();
  expect(load).toHaveBeenCalledTimes(2);
});
