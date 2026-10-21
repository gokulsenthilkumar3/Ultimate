import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SectionNavigation from '../components/SectionNavigation';
import PremiumSidebar from '../components/PremiumSidebar';
import Breadcrumbs from '../components/Breadcrumbs';

vi.mock('../store/useStore', () => ({ default: selector => selector({
  navigationOrder: [], navigationTabOrder: {}, sidebarCollapsed: false,
  setNavigationOrder: () => {}, setNavigationTabOrder: () => {}, setSidebarCollapsed: () => {},
}) }));
afterEach(cleanup);
function show(ui) { return render(<MemoryRouter initialEntries={['/finance/overview']}>{ui}</MemoryRouter>); }

describe('Section discovery', () => {
  it('keeps all six command areas reachable and Finance first', () => {
    show(<SectionNavigation activeTab="finance" />);
    const areas = within(screen.getByRole('navigation', { name: 'Life areas' }));
    expect(areas.getAllByRole('link')).toHaveLength(6);
    expect(areas.getAllByRole('link')[0]).toHaveTextContent('Finance');
    expect(areas.getByRole('link', { name: 'Life' })).toHaveAttribute('href', '/life/overview');
    expect(areas.getByRole('link', { name: 'Hub' })).toHaveAttribute('href', '/hub/overview');
    expect(within(screen.getByRole('navigation', { name: 'Finance tools' })).getByRole('link', { name: 'Overview', exact: true })).toHaveAttribute('aria-current', 'page');
  });
  it('highlights the actual module for legacy deep links', () => {
    show(<SectionNavigation activeTab="notes" />);
    expect(within(screen.getByRole('navigation', { name: 'Workspace tools' })).getByRole('link', { name: 'Notes', exact: true })).toHaveAttribute('aria-current', 'page');
  });
  it('shows context breadcrumbs without another module navigator', () => {
    show(<Breadcrumbs activeTab="finance" />);
    const breadcrumbs = within(screen.getByRole('navigation', { name: 'Breadcrumb' }));
    expect(breadcrumbs.getByText('Finance')).toBeVisible();
    expect(breadcrumbs.getByText('Overview')).toHaveAttribute('aria-current', 'page');
    expect(breadcrumbs.getByRole('link', { name: 'Go to Overview' })).toHaveAttribute('href', '/insights/overview');
  });
  it('uses links for all primary destinations in the rail', () => {
    show(<PremiumSidebar activeTab="overview" />);
    const areas = within(screen.getByRole('navigation', { name: 'Product areas' }));
    expect(areas.getByRole('link', { name: 'Wellness' })).toHaveAttribute('href', '/wellness/overview');
    expect(areas.getByRole('link', { name: 'Life' })).toHaveAttribute('href', '/life/overview');
    expect(areas.getByRole('link', { name: 'Hub' })).toHaveAttribute('href', '/hub/overview');
  });
  it('exposes all modules only for the active area', () => {
    show(<PremiumSidebar activeTab="finance" user={{ name: 'Owner' }} onOpenSettings={() => {}} onLogout={() => {}} />);
    const modules = within(screen.getByRole('navigation', { name: 'Finance modules' }));
    expect(modules.getByRole('link', { name: /Overview/ })).toHaveAttribute('aria-current', 'page');
    expect(modules.getByRole('link', { name: /Transactions/ })).toHaveAttribute('href', '/finance/transactions');
    expect(screen.queryByRole('link', { name: /Sleep/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Close module navigation' })).toBeVisible();
  });
});
