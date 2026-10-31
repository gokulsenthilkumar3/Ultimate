import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import useRoutePreload from './useRoutePreload';

const originalConnection = Object.getOwnPropertyDescriptor(navigator, 'connection');
const preload = vi.fn();
function Example({ ready = true, tier = 2 }) {
  const events = useRoutePreload({ ready, tier, preload });
  return <div {...events}><a href={`${import.meta.env.BASE_URL}life/overview`}>Life</a><a href="https://example.test/">External</a></div>;
}
const advance = async () => { await act(async () => { vi.advanceTimersByTime(180); await Promise.resolve(); }); };
beforeEach(() => { vi.useFakeTimers(); preload.mockReset().mockResolvedValue(undefined); Object.defineProperty(navigator, 'connection', { configurable: true, value: { saveData: false, effectiveType: '4g' } }); });
afterEach(() => { cleanup(); vi.useRealTimers(); if (originalConnection) Object.defineProperty(navigator, 'connection', originalConnection); else Reflect.deleteProperty(navigator, 'connection'); });

it('avoids accidental pointer prefetches and shares the deliberate hover request', async () => {
  render(<Example />); const life = screen.getByRole('link', { name: 'Life' });
  fireEvent.pointerOver(life); fireEvent.pointerOut(life); await advance(); expect(preload).not.toHaveBeenCalled();
  fireEvent.pointerOver(life); await advance(); expect(preload).toHaveBeenCalledWith('life');
  fireEvent.pointerOver(life); await advance(); expect(preload).toHaveBeenCalledTimes(1);
});

it('warms keyboard intent immediately and ignores external links', async () => {
  render(<Example />); fireEvent.focus(screen.getByRole('link', { name: 'External' })); await act(async () => {}); expect(preload).not.toHaveBeenCalled();
  fireEvent.focus(screen.getByRole('link', { name: 'Life' })); await act(async () => {}); expect(preload).toHaveBeenCalledWith('life');
});

it.each([{ ready: false }, { tier: 0 }, { connection: { saveData: true } }, { connection: { effectiveType: '2g' } }])('does not speculate during constrained loading: %j', async ({ connection, ...props }) => {
  if (connection) Object.defineProperty(navigator, 'connection', { configurable: true, value: connection });
  render(<Example {...props} />); fireEvent.pointerOver(screen.getByRole('link', { name: 'Life' })); await advance(); expect(preload).not.toHaveBeenCalled();
});

it('cancels pending work on unmount and allows a failed request to be retried', async () => {
  const view = render(<Example />); fireEvent.pointerOver(screen.getByRole('link', { name: 'Life' })); view.unmount(); await advance(); expect(preload).not.toHaveBeenCalled();
  preload.mockRejectedValueOnce(new Error('Temporary fetch failure')); render(<Example />);
  fireEvent.pointerOver(screen.getByRole('link', { name: 'Life' })); await advance();
  fireEvent.focus(screen.getByRole('link', { name: 'Life' })); await act(async () => {}); expect(preload).toHaveBeenCalledTimes(2);
});
