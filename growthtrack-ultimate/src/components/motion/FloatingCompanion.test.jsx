import React, { useSyncExternalStore } from 'react';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Header from '../Header';
import FloatingCompanion from './FloatingCompanion';
import { KineticContext } from './KineticContext';
import Modal from '../ui/Modal';
import { getActiveDialog, subscribeDialogs } from '../../hooks/useDialogFocus';
import useKineticPreferences, { KINETIC_PREFERENCE_KEY, setKineticPreferences } from '../../hooks/useKineticPreferences';

vi.mock('./CharacterScene', () => ({ default: () => <svg aria-hidden="true" />, MotionToggle: () => null }));
vi.mock('./PersonalCompanionArt', () => ({ default: ({ state, className, compact, decorative }) => <span className={className} data-testid="personal-companion-art" data-state={state} data-compact={String(Boolean(compact))} aria-hidden={decorative} /> }));
vi.mock('./AnimatedLogo', () => ({ default: () => <svg aria-hidden="true" /> }));

function Host({ external = false }) {
  const { companion } = useKineticPreferences();
  const activeDialog = useSyncExternalStore(subscribeDialogs, getActiveDialog, () => null);
  const location = useLocation();
  return <KineticContext.Provider value={{ enabled: true, canAnimate: false, tier: 0, budget: null, activeDialog }}>
    <Header activeTab="finance" user={{ name: 'Fixture' }} theme="light" setTheme={() => {}} />
    {companion && <FloatingCompanion />}
    <Modal open={external} title="Another workflow" onClose={() => {}}>Working record</Modal>
    <output data-testid="path">{location.pathname}</output>
  </KineticContext.Provider>;
}
const show = props => render(<MemoryRouter initialEntries={['/finance/overview']}><Host {...props} /></MemoryRouter>);
beforeEach(() => { setKineticPreferences({ companion: true, style: 'kinetic', lite: false }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); setKineticPreferences({ companion: true, style: 'kinetic', lite: false }); });

it('persists hide/show without changing motion preferences, and restores keyboard focus', async () => {
  setKineticPreferences({ style: 'playful', lite: true });
  show();
  await userEvent.click(within(screen.getByRole('complementary', { name: 'Workspace companion' })).getByRole('button', { name: 'Hide floating companion' }));
  expect(screen.queryByRole('button', { name: 'Open Sidekick companion' })).toBeNull();
  const toggle = screen.getByRole('button', { name: 'Show floating companion' });
  expect(toggle).toHaveFocus();
  expect(JSON.parse(localStorage.getItem(KINETIC_PREFERENCE_KEY))).toEqual({ style: 'playful', lite: true, companion: false });
  await userEvent.click(toggle);
  expect(screen.getByRole('button', { name: 'Open Sidekick companion' })).toBeVisible();
  expect(toggle).toHaveAttribute('aria-pressed', 'true');
});

it('uses existing owner routes, traps dialog focus, and makes no model requests on display', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  show();
  const trigger = screen.getByRole('button', { name: 'Open Sidekick companion' });
  await userEvent.click(trigger);
  const panel = screen.getByRole('dialog', { name: 'Your companion' });
  expect(within(panel).getByRole('button', { name: 'Close dialog' })).toHaveFocus();
  expect(within(panel).getByRole('link', { name: /Open Agents/ })).toHaveAttribute('href', '/hub/agents');
  const actions = within(panel).getByRole('link', { name: /Action Center/ });
  expect(actions).toHaveAttribute('href', '/insights/actions');
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(trigger).toHaveFocus();
  await userEvent.click(trigger);
  await userEvent.click(screen.getByRole('link', { name: /Action Center/ }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(screen.getByTestId('path')).toHaveTextContent('/insights/actions');
  expect(fetch).not.toHaveBeenCalled();
});

it('stays out of another dialog and follows visibility changes from another browser tab', async () => {
  const view = show({ external: true });
  expect(screen.getByRole('dialog', { name: 'Another workflow' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Open Sidekick companion' })).toBeNull();
  view.rerender(<MemoryRouter><Host external={false} /></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Open Sidekick companion' })).toBeVisible();
  act(() => {
    localStorage.setItem(KINETIC_PREFERENCE_KEY, JSON.stringify({ style: 'kinetic', lite: false, companion: false }));
    window.dispatchEvent(new StorageEvent('storage', { key: KINETIC_PREFERENCE_KEY }));
  });
  expect(screen.queryByRole('button', { name: 'Open Sidekick companion' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Show floating companion' })).toBeVisible();
});

it('changes the personal character pose locally without changing agent consent or preferences', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  show();
  const savedPreferences = localStorage.getItem(KINETIC_PREFERENCE_KEY);
  const trigger = screen.getByRole('button', { name: 'Open Sidekick companion' });
  const art = () => within(trigger).getByTestId('personal-companion-art');
  expect(art()).toHaveAttribute('data-compact', 'true');
  expect(art()).toHaveAttribute('aria-hidden', 'true');
  await userEvent.hover(trigger);
  expect(art()).toHaveAttribute('data-state', 'greet');
  await userEvent.click(trigger);
  const panel = screen.getByRole('dialog', { name: 'Your companion' });
  const poses = within(panel).getByRole('group', { name: 'Companion pose' });
  expect(poses).toHaveTextContent('Decoration only');
  expect(within(poses).getByRole('button', { name: 'Rest pose' })).toHaveAttribute('aria-pressed', 'true');
  for (const [label, state] of [['Focus', 'listen'], ['Cheer', 'celebrate'], ['Wave', 'greet']]) {
    const button = within(poses).getByRole('button', { name: label + ' pose' });
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(within(panel).getByTestId('personal-companion-art')).toHaveAttribute('data-state', state);
    expect(art()).toHaveAttribute('data-state', state);
  }
  await userEvent.click(within(poses).getByRole('button', { name: 'Focus pose' }));
  await userEvent.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
  expect(art()).toHaveAttribute('data-state', 'listen');
  expect(localStorage.getItem(KINETIC_PREFERENCE_KEY)).toBe(savedPreferences);
  expect(fetch).not.toHaveBeenCalled();
});
