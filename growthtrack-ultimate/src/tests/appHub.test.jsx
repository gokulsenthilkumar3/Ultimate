import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ state: { pinnedTabs: [], togglePinnedTab: vi.fn() } }));
vi.mock('../store/useStore', () => ({ default: selector => selector(mocks.state), selectPinnedTabs: s => s.pinnedTabs, selectTogglePinnedTab: s => s.togglePinnedTab }));
import AppLauncher from '../components/AppLauncher';
import storage from '../utils/safeLocalStorage';
beforeEach(() => { mocks.state.pinnedTabs = []; mocks.state.togglePinnedTab.mockClear(); storage.clear(); });
afterEach(cleanup);

it('searches navigation keywords and clears combined filters', () => {
  render(<AppLauncher />);
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search apps' }), { target: { value: 'water' } });
  expect(screen.getByRole('status')).toHaveTextContent('1 tool');
  expect(screen.getByRole('button', { name: 'Open Hydration' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Pinned 0' }));
  expect(screen.getByRole('heading', { name: 'Make this space yours' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Show all tools' }));
  expect(screen.getByRole('searchbox')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Pinned 0' })).toHaveAttribute('aria-pressed', 'false');
});

it('shows all pinned tools in quick launch and keeps pin actions separate', () => {
  mocks.state.pinnedTabs = ['tasks', 'sleep', 'finance', 'mind', 'goals', 'projects', 'maps', 'nutrition', 'hydration'];
  const navigate = vi.fn();
  render(<AppLauncher setActiveTab={navigate} />);
  const dock = within(screen.getByRole('region', { name: 'Quick launch' }));
  expect(dock.getAllByRole('button')).toHaveLength(9);
  fireEvent.click(dock.getByRole('button', { name: 'Open Hydration' }));
  expect(navigate).toHaveBeenCalledWith('hydration');
  navigate.mockClear();
  fireEvent.click(screen.getByRole('button', { name: 'Unpin Hydration' }));
  expect(mocks.state.togglePinnedTab).toHaveBeenCalledWith('hydration');
  expect(navigate).not.toHaveBeenCalled();
});

it('remembers list view when the hub is reopened', () => {
  const first = render(<AppLauncher />);
  fireEvent.click(screen.getByRole('button', { name: 'List view' }));
  first.unmount();
  render(<AppLauncher />);
  expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
});
