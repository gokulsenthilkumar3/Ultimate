import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PersonalCompanionArt from './PersonalCompanionArt';
import KineticProvider from './KineticProvider';
import { setPlayfulMotionPaused } from '../../hooks/usePlayfulMotion';
import useStore from '../../store/useStore';
import { setKineticPreferences } from '../../hooks/useKineticPreferences';

beforeEach(() => {
  vi.spyOn(navigator, 'hardwareConcurrency', 'get').mockReturnValue(8);
  setKineticPreferences({ style: 'kinetic', lite: false, companion: true });
});
afterEach(() => { cleanup(); setPlayfulMotionPaused(false); useStore.setState({ reducedMotion: false }); setKineticPreferences({ lite: false }); vi.restoreAllMocks(); });

it('releases its motion admission for pause, reduced motion and a parent-owned scene, keeping the chosen pose visible', () => {
  useStore.setState({ reducedMotion: false }); setPlayfulMotionPaused(false);
  const show = motion => <KineticProvider><PersonalCompanionArt motion={motion} state="celebrate" compact /></KineticProvider>;
  const view = render(show(true));
  const art = view.container.querySelector('.personal-companion');
  expect(art).toHaveAttribute('data-pose', 'celebrate');
  expect(art).toHaveAttribute('data-animate', 'true');
  expect(document.documentElement.dataset.animationCount).toBe('1');
  act(() => setPlayfulMotionPaused(true));
  expect(art).toHaveAttribute('data-animate', 'false');
  expect(document.documentElement.dataset.animationCount).toBe('0');
  act(() => setPlayfulMotionPaused(false));
  view.rerender(show(false));
  expect(art).toHaveAttribute('data-animate', 'false');
  expect(document.documentElement.dataset.animationCount).toBe('0');
  view.rerender(show(true));
  act(() => setKineticPreferences({ lite: true }));
  expect(art).toHaveAttribute('data-animate', 'false');
  expect(document.documentElement.dataset.animationCount).toBe('0');
  act(() => setKineticPreferences({ lite: false }));
  act(() => useStore.setState({ reducedMotion: true }));
  expect(art).toHaveAttribute('data-animate', 'false');
  expect(art.querySelector('img')).toHaveAttribute('alt', '');
  expect(art).toHaveAttribute('aria-hidden', 'true');
  expect(art.querySelector('img').getAttribute('src')).toMatch(/assets\/illustrations\/personal-companion-small-v4\.webp$/);
  view.unmount(); expect(document.documentElement.dataset.animationCount).toBe('0');
});

it('keeps its pose visible without admitting motion on low-core hardware', () => {
  vi.mocked(Object.getOwnPropertyDescriptor(navigator, 'hardwareConcurrency').get).mockReturnValue(2);
  const view = render(<KineticProvider><PersonalCompanionArt state="celebrate" compact /></KineticProvider>);
  expect(view.container.querySelector('.personal-companion')).toHaveAttribute('data-pose', 'celebrate');
  expect(view.container.querySelector('.personal-companion')).toHaveAttribute('data-animate', 'false');
  expect(document.documentElement.dataset.animationCount).toBe('0');
});
