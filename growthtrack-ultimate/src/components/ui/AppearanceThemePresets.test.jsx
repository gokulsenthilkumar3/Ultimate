import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import AppearanceThemePresets from './AppearanceThemePresets';
afterEach(cleanup);
describe('named colour themes', () => {
  it('exposes both named themes, their colours and selected state', () => {
    render(<AppearanceThemePresets value="bcl" onChange={() => Promise.resolve()} />);
    expect(screen.getByRole('button', { name: 'Use BCL theme' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Use GBB theme' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Midnight black, electric cobalt blue and acid lime.')).toBeVisible();
    expect(screen.getByText('Muted sage grey, warm cream beige and deep burgundy.')).toBeVisible();
  });
  it('waits for one save and prevents duplicate selection while pending', async () => {
    let complete; const save = vi.fn(() => new Promise(resolve => { complete = resolve; }));
    render(<AppearanceThemePresets value="forest" onChange={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use GBB theme' }));
    expect(screen.getByRole('button', { name: 'Use GBB theme' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Use BCL theme' })); expect(save).toHaveBeenCalledTimes(1);
    await act(async () => complete()); expect(screen.getByRole('button', { name: 'Use GBB theme' })).not.toBeDisabled();
  });
  it('shows failed persistence without claiming a saved theme', async () => {
    render(<AppearanceThemePresets value="forest" onChange={() => Promise.reject(new Error('Offline'))} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use BCL theme' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be saved');
    expect(screen.getByRole('button', { name: 'Use BCL theme' })).toHaveAttribute('aria-pressed', 'false');
  });
});
