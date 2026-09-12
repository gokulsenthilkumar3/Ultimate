import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import SectionNavigation from '../components/SectionNavigation';
import PremiumSidebar from '../components/PremiumSidebar';

vi.mock('../store/useStore', () => ({ default: selector => selector({
  navigationOrder: [], navigationTabOrder: {}, sidebarCollapsed: false,
  setNavigationOrder: () => {}, setNavigationTabOrder: () => {}, setSidebarCollapsed: () => {},
}) }));
vi.mock('../lib/navMotion', () => ({ animateIndicator: () => {} }));
afterEach(cleanup);

describe('Section discovery', () => {
  it('makes all eight areas reachable and preserves finance destinations', () => {
    const navigate = vi.fn();
    render(<SectionNavigation activeTab="finance" onNavigate={navigate} />);
    const areas = within(screen.getByRole('navigation', { name: 'Life areas' }));
    expect(areas.getAllByRole('button')).toHaveLength(8);
    fireEvent.click(areas.getByRole('button', { name: 'Life' }));
    expect(navigate).toHaveBeenLastCalledWith('social');
    fireEvent.click(screen.getByRole('button', { name: 'SIP Calculator' }));
    expect(navigate).toHaveBeenLastCalledWith('sip');
    expect(screen.getByRole('button', { name: 'Finance', exact: true })).toHaveAttribute('aria-current', 'page');
  });
  it('highlights the parent destination for legacy deep links', () => {
    render(<SectionNavigation activeTab="notes" onNavigate={() => {}} />);
    const tools = within(screen.getByRole('navigation', { name: 'Workspace tools' }));
    expect(tools.getByRole('button', { name: 'Workspace' })).toHaveAttribute('aria-current', 'page');
  });
  it('keeps sidebar tools discoverable through expansion and keyword search', () => {
    const navigate = vi.fn();
    render(<PremiumSidebar activeTab="overview" setActiveTab={navigate} />);
    expect(screen.queryByRole('button', { name: 'Sleep', exact: true })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Wellness', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Sleep', exact: true }));
    expect(navigate).toHaveBeenLastCalledWith('sleep');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search navigation' }), { target: { value: 'budget' } });
    fireEvent.click(screen.getByRole('button', { name: 'Finance', exact: true }));
    expect(navigate).toHaveBeenLastCalledWith('finance');
    fireEvent.change(screen.getByRole('textbox', { name: 'Search navigation' }), { target: { value: 'no-such-tool' } });
    expect(screen.getByRole('status')).toHaveTextContent('No tools found');
    fireEvent.click(screen.getByRole('button', { name: 'Clear navigation search' }));
    expect(screen.getByRole('button', { name: 'Overview', exact: true })).toBeVisible();
  });
});
