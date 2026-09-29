import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PremiumSidebar from './PremiumSidebar';
import FloatingPillDock from './FloatingPillDock';
import { GROUPS, tabMeta } from '../config/navigation';

const model = vi.hoisted(() => ({ state: {}, listeners: new Set(), setCollapsed: vi.fn() }));
vi.mock('../store/useStore', () => ({ default: function useMockStore(selector) { return React.useSyncExternalStore(
  listener => { model.listeners.add(listener); return () => model.listeners.delete(listener); },
  () => selector(model.state),
); } }));
let width;
const viewportListeners = new Set();
function resize(next) { act(() => { width = next; vi.stubGlobal('innerWidth', next); viewportListeners.forEach(listener => listener()); }); }
function Location() { return <output data-testid="location">{useLocation().pathname}</output>; }
function mount(props = {}, path = tabMeta('finance').canonicalPath) {
  return render(<MemoryRouter initialEntries={[path]}><PremiumSidebar activeTab="finance" {...props} /><FloatingPillDock activeTab={props.activeTab || 'finance'} /><Location /></MemoryRouter>);
}
beforeEach(() => {
  width = 1280;
  vi.stubGlobal('innerWidth', width);
  model.state = { navigationOrder: [], navigationTabOrder: {}, sidebarCollapsed: false, setSidebarCollapsed: model.setCollapsed };
  model.setCollapsed.mockReset().mockImplementation(value => { model.state = { ...model.state, sidebarCollapsed: value }; model.listeners.forEach(listener => listener()); });
  vi.stubGlobal('matchMedia', query => ({ media: query, get matches() { return width <= Number(query.match(/\d+/)[0]); }, addEventListener: (_event, listener) => viewportListeners.add(listener), removeEventListener: (_event, listener) => viewportListeners.delete(listener) }));
});
afterEach(() => { cleanup(); viewportListeners.clear(); model.listeners.clear(); vi.unstubAllGlobals(); });

describe('responsive canonical navigation', () => {
  it('uses six canonical area links, Finance first, and preserves saved area/module order', async () => {
    model.state.navigationOrder = ['life', 'money'];
    model.state.navigationTabOrder = { money: [...GROUPS.money.tabs].reverse() };
    const navigate = vi.fn();
    mount({ setActiveTab: navigate });
    const areas = within(screen.getByRole('navigation', { name: 'Product areas' })).getAllByRole('link');
    expect(areas).toHaveLength(6);
    expect(areas[0]).toHaveAccessibleName('Life');
    expect(areas[1]).toHaveAccessibleName('Finance');
    const modules = within(screen.getByRole('navigation', { name: 'Finance modules' })).getAllByRole('link');
    expect(modules).toHaveLength(GROUPS.money.tabs.length);
    expect(modules[0]).toHaveAttribute('href', tabMeta(GROUPS.money.tabs.at(-1)).canonicalPath);
    await userEvent.click(areas.find(link => link.textContent === 'Insights'));
    expect(screen.getByTestId('location')).toHaveTextContent(tabMeta('overview').canonicalPath);
    expect(navigate).not.toHaveBeenCalled();
    expect(model.setCollapsed).not.toHaveBeenCalled();
  });
  it('keeps the desktop reopen control reachable and removes collapsed links from tab order', async () => {
    mount();
    await userEvent.click(screen.getByRole('button', { name: 'Close modules', exact: true }));
    expect(screen.queryByRole('navigation', { name: 'Finance modules' })).toBeNull();
    const reopen = screen.getByRole('button', { name: 'Open module navigation' });
    expect(reopen).toHaveFocus();
    await userEvent.click(reopen);
    expect(screen.getByRole('navigation', { name: 'Finance modules' })).toBeVisible();
    expect(model.setCollapsed.mock.calls).toEqual([[true], [false]]);
  });
  it('opens a compact focus-trapped drawer, dismisses via Escape/backdrop, and keeps desktop preference', async () => {
    width = 800; vi.stubGlobal('innerWidth', width);
    model.state.sidebarCollapsed = true;
    mount();
    const trigger = screen.getByRole('button', { name: 'Open module navigation' });
    await userEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Finance' });
    const buttons = within(dialog).getAllByRole('button');
    expect(buttons[0]).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(within(dialog).getAllByRole('link').at(-1)).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
    await userEvent.click(trigger);
    fireEvent.click(document.querySelector('.gt-navigation-shade'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(model.setCollapsed).not.toHaveBeenCalled();
  });
  it('renders four destinations plus an explicit More at 639, and one rail at 640/1023/1024', async () => {
    width = 639; vi.stubGlobal('innerWidth', width);
    mount();
    const dock = within(screen.getByRole('navigation', { name: 'Quick navigation' }));
    expect(dock.getAllByRole('link').map(link => link.getAttribute('aria-label'))).toEqual(['Finance', 'Insights', 'Wellness', 'Workspace']);
    expect(dock.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('navigation', { name: 'Product areas' })).toBeNull();
    await userEvent.click(dock.getByRole('button', { name: 'More' }));
    expect(screen.getByRole('searchbox', { name: 'Find a module' })).toHaveFocus();
    expect(within(screen.getByRole('dialog')).getAllByRole('heading', { level: 3 })).toHaveLength(6);
    resize(640);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Quick navigation' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Open module navigation' })).toBeVisible();
    resize(1023);
    expect(screen.queryByRole('navigation', { name: 'Finance modules' })).toBeNull();
    resize(1024);
    expect(screen.getByRole('navigation', { name: 'Finance modules' })).toBeVisible();
  });
  it('searches all six areas, follows module links, and respects custom quick order', async () => {
    width = 390; vi.stubGlobal('innerWidth', width);
    model.state.navigationOrder = ['life', 'system', 'work', 'money'];
    mount({ activeTab: 'notes' }, tabMeta('notes').canonicalPath);
    const dock = within(screen.getByRole('navigation', { name: 'Quick navigation' }));
    expect(dock.getAllByRole('link')[0]).toHaveAccessibleName('Life');
    await userEvent.click(dock.getByRole('button', { name: 'More' }));
    const search = screen.getByRole('searchbox');
    await userEvent.type(search, 'Calendar');
    expect(screen.queryByRole('heading', { name: 'Finance', level: 3 })).toBeNull();
    const calendar = within(screen.getByRole('navigation', { name: 'All modules' })).getByRole('link', { name: 'Calendar' });
    expect(calendar).toHaveAttribute('href', tabMeta('calendar').canonicalPath);
    await userEvent.click(calendar);
    expect(screen.getByTestId('location')).toHaveTextContent(tabMeta('calendar').canonicalPath);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('keeps actions as buttons without changing routes', async () => {
    const settings = vi.fn(), logout = vi.fn();
    mount({ onOpenSettings: settings, onLogout: logout });
    await userEvent.click(screen.getByRole('button', { name: 'Settings', exact: true }));
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(settings).toHaveBeenCalledOnce(); expect(logout).toHaveBeenCalledOnce();
    expect(screen.getByTestId('location')).toHaveTextContent(tabMeta('finance').canonicalPath);
  });
  it('falls back to resize observation when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    vi.stubGlobal('innerWidth', 800);
    mount();
    expect(screen.getByRole('navigation', { name: 'Product areas' })).toBeVisible();
    expect(screen.queryByRole('navigation', { name: 'Finance modules' })).toBeNull();
    vi.stubGlobal('innerWidth', 390);
    fireEvent(window, new Event('resize'));
    expect(screen.getByRole('navigation', { name: 'Quick navigation' })).toBeVisible();
    expect(screen.queryByRole('navigation', { name: 'Product areas' })).toBeNull();
  });
  it.each([
    { trigger: 'Close modules', collapsed: false, next: true },
    { trigger: 'Open module navigation', collapsed: true, next: false },
  ])('handles rejected collapse promises and retries the failed intent ($trigger)', async ({ trigger, collapsed, next }) => {
    model.state.sidebarCollapsed = collapsed;
    model.setCollapsed.mockImplementationOnce(() => Promise.reject(new Error('Server 503')));
    mount();
    await userEvent.click(screen.getByRole('button', { name: trigger, exact: true }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save navigation preference.');
    expect(model.state.sidebarCollapsed).toBe(collapsed);
    await userEvent.click(screen.getByRole('button', { name: 'Retry navigation save' }));
    expect(model.setCollapsed.mock.calls).toEqual([[next], [next]]);
    expect(model.state.sidebarCollapsed).toBe(next);
    expect(screen.queryByRole('alert')).toBeNull();
  });
  it('guards duplicate preference requests while a returned promise is pending', async () => {
    let resolve;
    model.setCollapsed.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    mount();
    const toggle = screen.getByRole('button', { name: 'Close module navigation' });
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(toggle); expect(model.setCollapsed).toHaveBeenCalledOnce();
    await act(async () => { resolve(); });
    expect(toggle).not.toHaveAttribute('aria-busy');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
