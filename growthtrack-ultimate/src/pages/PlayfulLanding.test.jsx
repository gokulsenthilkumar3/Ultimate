import React, { StrictMode } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LandingPage from './LandingPage';
import { OverviewCompanion } from '../components/motion/CharacterScene';
import { setPlayfulMotionPaused } from '../hooks/usePlayfulMotion';
import useStore from '../store/useStore';

beforeEach(() => {
  setPlayfulMotionPaused(false);
  useStore.setState({ reducedMotion: false });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  setPlayfulMotionPaused(false);
});
const show = (extra = null) => render(<StrictMode><MemoryRouter><LandingPage />{extra}</MemoryRouter></StrictMode>);

describe('fictional landing flow', () => {
  it('lets the keyboard snip and replay the hero without changing the day, storage, or account', async () => {
    const user = userEvent.setup();
    const network = vi.spyOn(globalThis, 'fetch');
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const setUser = vi.spyOn(useStore.getState(), 'setUser');
    show();

    screen.getByRole('button', { name: 'Snip the noise' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('A little less noise. A little more room for you.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Play it again' })).toHaveFocus();
    expect(screen.getByRole('checkbox', { name: 'Write one good paragraph' })).not.toBeChecked();
    await user.keyboard(' ');
    expect(screen.getByText('Siren spots the noise. Snip makes a little space.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Snip the noise' })).toHaveFocus();
    expect(network).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
    expect(setUser).not.toHaveBeenCalled();
  });

  it('keeps the hero usable with reduced motion and starts fresh after reopening', async () => {
    const user = userEvent.setup();
    useStore.setState({ reducedMotion: true });
    const view = show();
    expect(screen.getByRole('button', { name: 'Reduced motion is on' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Snip the noise' }));
    expect(screen.getByText('A little less noise. A little more room for you.')).toBeVisible();
    view.unmount();
    show();
    expect(screen.getByRole('button', { name: 'Snip the noise' })).toBeVisible();
    expect(screen.getByText('Siren spots the noise. Snip makes a little space.')).toBeVisible();
  });

  it('lets visitors try every day, keeps their individual checks, and resets only the current day', async () => {
    const user = userEvent.setup();
    const network = vi.spyOn(globalThis, 'fetch');
    const setUser = vi.spyOn(useStore.getState(), 'setUser');
    show();

    await user.click(screen.getByRole('checkbox', { name: 'Write one good paragraph' }));
    expect(screen.getByRole('status')).toHaveTextContent('One tiny win. Nice work!');
    expect(screen.getByText('1 of 3 little wins')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Feel a little better' }));
    expect(screen.getByText('0 of 3 little wins')).toBeVisible();
    await user.click(screen.getByRole('checkbox', { name: 'Take a five-minute stretch' }));
    await user.click(screen.getByRole('button', { name: 'Make room for life' }));
    await user.click(screen.getByRole('checkbox', { name: 'Send a little hello' }));
    await user.click(screen.getByRole('button', { name: 'Reset this day' }));
    expect(screen.getByRole('checkbox', { name: 'Send a little hello' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Reset this day' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Find my focus' }));
    expect(screen.getByRole('checkbox', { name: 'Write one good paragraph' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Feel a little better' }));
    expect(screen.getByRole('checkbox', { name: 'Take a five-minute stretch' })).toBeChecked();
    expect(network).not.toHaveBeenCalled();
    expect(setUser).not.toHaveBeenCalled();
  });

  it('works with the keyboard and leaves the focused checkbox available after checking', async () => {
    const user = userEvent.setup();
    show();
    const checkbox = screen.getByRole('checkbox', { name: 'Write one good paragraph' });
    checkbox.focus();
    await user.keyboard(' ');
    expect(checkbox).toBeChecked();
    expect(checkbox).toHaveFocus();
    await user.keyboard(' ');
    expect(checkbox).not.toBeChecked();
    screen.getByRole('button', { name: 'Make room for life' }).focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Make room for life' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('checkbox', { name: 'Send a little hello' })).toBeVisible();
  });

  it('preserves the application base path and sends owner entry to the existing login route', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter basename="/Ultimate" initialEntries={['/Ultimate/welcome']}><Routes>
      <Route path="/welcome" element={<LandingPage />} />
      <Route path="/login" element={<p>Existing owner sign-in destination</p>} />
    </Routes></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Try the tiny demo' })).toHaveAttribute('href', '#playground');
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/Ultimate/privacy');
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/Ultimate/terms');
    await user.click(screen.getByRole('link', { name: 'Owner sign in' }));
    expect(screen.getByText('Existing owner sign-in destination')).toBeVisible();
  });

  it('discards fictional task changes on leaving and reopening the landing page', async () => {
    const user = userEvent.setup();
    const view = show();
    await user.click(screen.getByRole('checkbox', { name: 'Write one good paragraph' }));
    view.unmount();
    show();
    expect(screen.getByRole('checkbox', { name: 'Write one good paragraph' })).not.toBeChecked();
    expect(screen.getByText('0 of 3 little wins')).toBeVisible();
  });
});

describe('decorative motion controls', () => {
  it('pauses every scene and overview companion together while keeping the demo usable', async () => {
    const user = userEvent.setup();
    const { container } = show(<OverviewCompanion kind="snip" />);
    expect(screen.getAllByRole('button', { name: 'Pause motion' })).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: 'Pause motion' })[0]);
    expect(screen.getAllByRole('button', { name: 'Play motion' })).toHaveLength(2);
    expect(container.querySelectorAll('.character-scene[data-animate="true"]')).toHaveLength(0);
    expect(container.querySelector('[data-parallax]').style.getPropertyValue('--parallax-y')).toBe('');
    await user.click(screen.getByRole('checkbox', { name: 'Write one good paragraph' }));
    expect(screen.getByText('1 of 3 little wins')).toBeVisible();
    await user.click(screen.getAllByRole('button', { name: 'Play motion' })[1]);
    expect(container.querySelector('.character-scene')).toHaveAttribute('data-animate', 'true');
  });

  it('honours the saved app preference without allowing the public toggle to override it', () => {
    useStore.setState({ reducedMotion: true });
    const { container } = show();
    expect(screen.getByRole('button', { name: 'Reduced motion is on' })).toBeDisabled();
    expect(container.querySelector('main')).toHaveAttribute('data-playful-motion', 'false');
    expect(container.querySelectorAll('.character-scene[data-animate="true"]')).toHaveLength(0);
  });

  it('responds to operating-system motion changes while the page is open', () => {
    const listeners = new Set();
    const media = { matches: true, addEventListener: (_event, listener) => listeners.add(listener), removeEventListener: (_event, listener) => listeners.delete(listener) };
    vi.stubGlobal('matchMedia', vi.fn(() => media));
    const { container, unmount } = show();
    expect(screen.getByRole('button', { name: 'Reduced motion is on' })).toBeDisabled();
    act(() => { media.matches = false; listeners.forEach(listener => listener()); });
    expect(screen.getByRole('button', { name: 'Pause motion' })).toBeEnabled();
    expect(container.querySelector('main')).toHaveAttribute('data-playful-motion', 'true');
    unmount();
    expect(listeners.size).toBe(0);
  });

  it('stops hidden and offscreen scenes and disconnects their observers on unmount', () => {
    const observers = [];
    class Observer {
      constructor(callback) { this.callback = callback; this.disconnect = vi.fn(); observers.push(this); }
      observe(target) { this.target = target; }
    }
    vi.stubGlobal('IntersectionObserver', Observer);
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    const { container, unmount } = show();
    // StrictMode replaces observers during its effect cleanup rehearsal.
    const activeObservers = observers.filter(observer => !observer.disconnect.mock.calls.length);
    expect(container.querySelectorAll('.character-scene[data-animate="true"]')).toHaveLength(0);
    act(() => activeObservers.forEach(observer => observer.callback([{ isIntersecting: true }])));
    const firstScene = activeObservers.find(observer => observer.target.classList.contains('character-scene'));
    act(() => firstScene.callback([{ isIntersecting: false }]));
    expect(container.querySelector('.character-scene')).toHaveAttribute('data-animate', 'false');
    act(() => { visibility.mockReturnValue('hidden'); document.dispatchEvent(new Event('visibilitychange')); });
    expect(container.querySelectorAll('.character-scene[data-animate="true"]')).toHaveLength(0);
    act(() => { visibility.mockReturnValue('visible'); document.dispatchEvent(new Event('visibilitychange')); });
    expect(container.querySelector('.character-scene')).toHaveAttribute('data-animate', 'false');
    expect(container.querySelectorAll('.character-scene[data-animate="true"]').length).toBeGreaterThan(0);
    unmount();
    expect(observers.every(observer => observer.disconnect.mock.calls.length > 0)).toBe(true);
  });
});
