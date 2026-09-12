import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import SectionNavigation from '../components/SectionNavigation';
import PremiumSidebar from '../components/PremiumSidebar';
import Breadcrumbs from '../components/Breadcrumbs';

vi.mock('../store/useStore', () => ({ default: selector => selector({
  navigationOrder: [], navigationTabOrder: {}, sidebarCollapsed: false,
  setNavigationOrder: () => {}, setNavigationTabOrder: () => {}, setSidebarCollapsed: () => {},
}) }));
vi.mock('../lib/navMotion', () => ({ animateIndicator: () => {} }));
afterEach(cleanup);

describe('Section discovery', () => {
  it('makes command areas reachable and preserves command-first navigation', () => {
    const navigate = vi.fn();
    render(<SectionNavigation activeTab="finance" onNavigate={navigate} />);
    const areas = within(screen.getByRole('navigation', { name: 'Life areas' }));
    expect(areas.getAllByRole('button')).toHaveLength(6);
    fireEvent.click(areas.getByRole('button', { name: 'Life' }));
    expect(navigate).toHaveBeenLastCalledWith('life');
    fireEvent.click(areas.getByRole('button', { name: 'Hub' }));
    expect(navigate).toHaveBeenLastCalledWith('hub');
    expect(within(screen.getByRole('navigation', { name: 'Finance tools' })).getByRole('button', { name: 'Finance', exact: true })).toHaveAttribute('aria-current', 'page');
  });
  it('highlights the parent destination for legacy deep links', () => {
    render(<SectionNavigation activeTab="notes" onNavigate={() => {}} />);
    const tools = within(screen.getByRole('navigation', { name: 'Workspace tools' }));
    expect(tools.getByRole('button', { name: 'Workspace' })).toHaveAttribute('aria-current', 'page');
  });
  it('shows context breadcrumbs without duplicating the module navigator', () => {
    const navigate = vi.fn();
    render(<Breadcrumbs activeTab="finance" onNavigate={navigate} />);
    const breadcrumbs = within(screen.getByRole('navigation', { name: 'Breadcrumb' }));
    expect(breadcrumbs.getByText('Finance')).toBeVisible();
    expect(breadcrumbs.getByText('Finance Command')).toHaveAttribute('aria-current', 'page');
    fireEvent.click(breadcrumbs.getByRole('button', { name: 'Go to Overview' }));
    expect(navigate).toHaveBeenLastCalledWith('overview');
  });
  it('opens command destinations from the compact sidebar', () => {
    const navigate = vi.fn();
    render(<PremiumSidebar activeTab="overview" setActiveTab={navigate} />);
    expect(screen.queryByRole('button', { name: 'Sleep', exact: true })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Wellness', exact: true }));
    expect(navigate).toHaveBeenLastCalledWith('wellness');
    fireEvent.click(screen.getByRole('button', { name: 'Life', exact: true }));
    expect(navigate).toHaveBeenLastCalledWith('life');
    fireEvent.click(screen.getByRole('button', { name: 'Hub', exact: true }));
    expect(navigate).toHaveBeenLastCalledWith('hub');
  });
});
