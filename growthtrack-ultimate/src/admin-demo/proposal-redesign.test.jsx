import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminDemo from './AdminDemo';
import { PAGES, demoHref } from './catalog';
import { screenScope } from './models/screenScope';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  window.scrollTo = vi.fn();
});
beforeEach(() => { localStorage.clear(); window.innerWidth = 1440; window.innerHeight = 900; });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
async function ready() { await waitFor(() => expect(screen.getByRole('button', { name: /Approve this view|View approved/ }).disabled).toBe(false), { timeout: 5000 }); }
async function portal(id, view) { window.location.hash = demoHref(id, view); render(<AdminDemo />); await ready(); }
async function navigate(id, view) { act(() => { window.location.hash = demoHref(id, view); window.dispatchEvent(new HashChangeEvent('hashchange')); }); await ready(); }
function metric(label) { return screen.getByText(label, { selector: '.metric-label' }).closest('article').querySelector('.metric-value').textContent; }

describe('Shared scope, state and public-page contracts', () => {
  it('never declares a fixture screen LIVE and classifies setup and schematic views', () => {
    for (const page of PAGES) for (const view of page.views.length ? page.views : ['']) expect(screenScope(page, view).mode).not.toBe('live');
    expect(screenScope(PAGES.find(page => page.id === 'calendar'), 'connections').mode).toBe('setup');
    expect(screenScope(PAGES.find(page => page.id === 'maps'), 'map').detail).toBe('Schematic');
  });
  it('shows inherited source information for setup panels', async () => {
    await portal('calendar', 'connections');
    expect(document.querySelector('.scope-badge > span').textContent).toBe('SETUP');
    expect(document.querySelector('.provenance-chip').textContent).toBe('Not connected');
  });
  it.each(['denied', 'unavailable'])('%s hides customer content and provides a recovery action', async state => {
    await portal('customers');
    fireEvent.change(screen.getByLabelText('Preview state'), { target: { value: state } });
    expect(screen.queryByRole('table', { name: 'Customer directory' })).toBeNull();
    expect(screen.queryByText('Maya Raman')).toBeNull();
    expect(document.querySelector(`[data-state="${state}"]`)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: state === 'denied' ? 'Return to overview' : 'Try again' }));
    await ready();
    expect(screen.getByLabelText('Preview state').value).toBe('populated');
  });
  it('uses a bare public composition while preserving review and theme controls', async () => {
    await portal('privacy');
    expect(document.getElementById('main-navigation').hidden).toBe(true);
    expect(document.querySelector('.topbar').hidden).toBe(true);
    expect(document.querySelector('.portal').classList.contains('portal-public')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(document.querySelector('.portal').dataset.theme).toBe('dark');
    expect(screen.getByRole('button', { name: 'Approve this view' })).toBeTruthy();
  });
  it('updates density and theme from the account controls without inventing a session', async () => {
    await portal('customers'); fireEvent.click(screen.getByRole('button', { name: 'Account options' }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.change(dialog.getByLabelText('Account information density'), { target: { value: 'compact' } });
    fireEvent.change(dialog.getByLabelText('Account theme'), { target: { value: 'dark' } });
    expect(document.querySelector('.portal').dataset.density).toBe('compact');
    expect(document.querySelector('.portal').dataset.theme).toBe('dark');
    expect(dialog.getByRole('button', { name: 'Sign out' }).disabled).toBe(true);
  });
});

describe('Customer master/detail and filter scope', () => {
  it('opens inline details, keeps dialog IDs unique and restores focus', async () => {
    await portal('customers');
    const opener = screen.getByRole('button', { name: 'Preview Maya Raman' }); fireEvent.click(opener);
    expect(screen.getByRole('region', { name: 'OxFin customer preview' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Customer preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open full profile' }));
    const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close customer preview' }));
    expect(document.activeElement).toBe(opener);
  });
  it('clears a selected profile when the directory is filtered to another product', async () => {
    await portal('customers'); fireEvent.click(screen.getByRole('button', { name: 'Preview Maya Raman' }));
    fireEvent.change(screen.getByLabelText('Customer product filter'), { target: { value: 'FinSync' } });
    expect(screen.queryByRole('region', { name: 'OxFin customer preview' })).toBeNull();
    expect(screen.queryByText('Maya Raman')).toBeNull();
    fireEvent.change(screen.getByLabelText('Customer plan filter'), { target: { value: 'Plus' } });
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(4);
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(screen.getByText('Maya Raman')).toBeTruthy();
  });
  it('shares inline plan changes with the full sample profile', async () => {
    await portal('finsync'); fireEvent.click(screen.getByRole('button', { name: 'Preview Aarav Mehta' }));
    const detail = within(screen.getByRole('region', { name: 'FinSync customer preview' }));
    fireEvent.change(detail.getByLabelText('Sample plan'), { target: { value: 'Premium' } });
    fireEvent.click(detail.getByRole('button', { name: 'Update sample plan' }));
    const row = within(screen.getByRole('table')).getByText('Aarav Mehta').closest('tr');
    expect(within(row).getByText('Premium')).toBeTruthy();
  });
  it('searches tasks without showing a contradictory no-results state', async () => {
    await portal('customers'); fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    fireEvent.change(screen.getByLabelText('Search pages, customers, tasks and notes'), { target: { value: 'Review OxFin support requests' } });
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('Review OxFin support requests')).toBeTruthy(); expect(dialog.queryByText('No results yet')).toBeNull();
  });
  it('searches the current note draft rather than only the original sample text', async () => {
    await portal('notes', 'editor');
    fireEvent.change(screen.getByLabelText('Note body'), { target: { value: 'A very specific draft phrase.' } });
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    fireEvent.change(screen.getByLabelText('Search pages, customers, tasks and notes'), { target: { value: 'specific draft phrase' } });
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: /A few thoughts for the week/ }));
    expect(within(screen.getByRole('dialog')).getByText('A very specific draft phrase.')).toBeTruthy();
  });
});

describe('Ledger filters and accounting summaries', () => {
  it('calculates the summary and footer from search results rather than the complete ledger', async () => {
    await portal('transactions', 'all');
    fireEvent.change(screen.getByLabelText('Search transactions…'), { target: { value: 'Electricity' } });
    expect(metric('Income')).toBe('₹ 0.00'); expect(metric('Expenses')).toBe('₹ 1,280.00');
    expect(metric('Net balance')).toBe('(₹ 1,280.00)'); expect(metric('Savings rate')).toBe('—');
    expect(screen.getByText('Net in this view: (₹ 1,280.00)')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(metric('Net balance')).toBe('₹ 48,620.00');
  });
  it('uses the same date and category scope for the table and totals', async () => {
    await portal('transactions', 'all');
    fireEvent.change(screen.getByLabelText('Transaction start date'), { target: { value: '2026-10-28' } });
    fireEvent.change(screen.getByLabelText('Transaction end date'), { target: { value: '2026-10-28' } });
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3);
    fireEvent.change(screen.getByLabelText('Transaction category filter'), { target: { value: 'Food & essentials' } });
    expect(metric('Expenses')).toBe('₹ 2,140.00');
    expect(within(screen.getByRole('table')).queryByText('Monthly salary')).toBeNull();
  });
  it('explains an impossible date range and resets it effectively', async () => {
    await portal('transactions');
    fireEvent.change(screen.getByLabelText('Transaction start date'), { target: { value: '2026-11-01' } });
    fireEvent.change(screen.getByLabelText('Transaction end date'), { target: { value: '2026-10-01' } });
    expect(screen.getByRole('alert').textContent).toContain('start date');
    expect(metric('Expenses')).toBe('₹ 0.00');
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.queryByRole('alert')).toBeNull(); expect(metric('Expenses')).toBe('₹ 36,380.00');
  });
  it('uses position quantities and prices consistently in portfolio totals and allocation', async () => {
    await portal('portfolio', 'holdings');
    const row = within(screen.getByRole('table', { name: 'Portfolio holdings' })).getByText('HDFCBANK').closest('tr');
    expect(within(row).getByText('50')).toBeTruthy();
    expect(within(row).getByText('₹ 1,724.25')).toBeTruthy(); expect(within(row).getByText('₹ 86,212.50')).toBeTruthy();
    expect(metric('Portfolio value')).toBe('₹ 3,37,292.50');
    await navigate('portfolio', 'allocation'); expect(screen.getByText('Total sample holdings: ₹ 3,37,292.50')).toBeTruthy();
  });
});

describe('Distinct notification, log and action artifacts', () => {
  it('keeps read state across navigation and distinguishes unread from all', async () => {
    await portal('notifications', 'unread');
    fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
    expect(screen.getByRole('heading', { name: 'You’re all caught up' })).toBeTruthy();
    await navigate('overview'); await navigate('notifications', 'unread');
    expect(screen.getByRole('heading', { name: 'You’re all caught up' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'View all notifications' })); await ready();
    expect(screen.getByRole('button', { name: 'Mark New FinSync customer as unread' })).toBeTruthy();
  });
  it('retains notification preferences outside the page component', async () => {
    await portal('notifications', 'preferences');
    fireEvent.click(screen.getByRole('checkbox', { name: /Email summaries/ }));
    await navigate('tasks'); await navigate('notifications', 'preferences');
    expect(screen.getByRole('checkbox', { name: /Email summaries/ }).checked).toBe(true);
  });
  it('uses independent columns and sample records for each log type', async () => {
    await portal('logs', 'activity');
    expect(screen.getByRole('columnheader', { name: 'Actor' })).toBeTruthy();
    await navigate('logs', 'authentication');
    expect(screen.getByRole('columnheader', { name: 'Method' })).toBeTruthy();
    expect(screen.queryByRole('columnheader', { name: 'Actor' })).toBeNull();
    expect(screen.getByText('No session created')).toBeTruthy();
    await navigate('logs', 'sync'); expect(screen.getByRole('columnheader', { name: 'Direction' })).toBeTruthy();
    expect(screen.queryByText('Sign-in result layout')).toBeNull();
  });
  it('dismisses and restores a task without relabelling the active list', async () => {
    await portal('actions', 'today');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Review OxFin support requests' }));
    expect(screen.queryByText('Review OxFin support requests')).toBeNull();
    await navigate('actions', 'dismissed');
    fireEvent.click(screen.getByRole('button', { name: 'Restore Review OxFin support requests' }));
    await navigate('actions', 'today'); expect(screen.getByText('Review OxFin support requests')).toBeTruthy();
  });
  it('keeps snoozed tasks separate and completes through the shared task model', async () => {
    await portal('actions', 'today');
    fireEvent.click(screen.getByRole('button', { name: 'Snooze Review OxFin support requests' }));
    await navigate('actions', 'snoozed'); expect(screen.getByText('Review OxFin support requests')).toBeTruthy();
    await navigate('actions', 'today'); expect(screen.queryByText('Review OxFin support requests')).toBeNull();
    await navigate('actions', 'snoozed'); fireEvent.click(screen.getByRole('button', { name: 'Restore Review OxFin support requests' }));
    await navigate('actions', 'today'); fireEvent.click(screen.getByRole('button', { name: 'Complete Review OxFin support requests' }));
    await navigate('tasks', 'completed'); expect(screen.getByRole('button', { name: 'Reopen Review OxFin support requests' })).toBeTruthy();
  });
  it('keeps two tasks with the same title independent', async () => {
    await portal('tasks', 'all');
    for (let index = 0; index < 2; index++) {
      fireEvent.click(screen.getAllByRole('button', { name: 'New sample task' })[0]);
      const dialog = within(screen.getByRole('dialog')); fireEvent.change(dialog.getByLabelText('Title'), { target: { value: 'Repeated local task' } });
      fireEvent.click(dialog.getByRole('button', { name: 'Add to demo' }));
    }
    fireEvent.click(screen.getAllByRole('button', { name: 'Complete Repeated local task' })[0]);
    expect(screen.getByRole('button', { name: 'Reopen Repeated local task' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Complete Repeated local task' })).toBeTruthy();
  });
});

describe('Timesheet artifacts and explicit completions', () => {
  it('records actual local elapsed time once and derives analytics from the same history', async () => {
    let now = Date.now(); vi.spyOn(Date, 'now').mockImplementation(() => now);
    await portal('timesheet', 'timer');
    fireEvent.click(screen.getByRole('button', { name: 'Start sample session' })); now += 65000;
    fireEvent.click(screen.getByRole('button', { name: 'Pause sample session' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish sample session' }));
    await navigate('timesheet', 'sessions');
    expect(screen.queryByRole('timer')).toBeNull();
    expect(within(screen.getByRole('table', { name: 'Focus session history' })).getByText('1m 5s')).toBeTruthy();
    expect(metric('Sessions')).toBe('4');
    await navigate('timesheet', 'analytics');
    expect(screen.getByRole('table', { name: 'Daily focus totals' })).toBeTruthy(); expect(metric('Sessions')).toBe('4');
  });
  it('completes a timer while another page is open', async () => {
    await portal('timesheet', 'timer'); await navigate('overview'); await navigate('timesheet', 'timer');
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Start sample session' }));
    act(() => { window.location.hash = demoHref('overview'); window.dispatchEvent(new HashChangeEvent('hashchange')); });
    await act(async () => { await vi.advanceTimersByTimeAsync(1500000); });
    vi.useRealTimers();
    await navigate('timesheet', 'sessions');
    expect(within(screen.getByRole('table', { name: 'Focus session history' })).getAllByText('Local focus session')).toHaveLength(1);
    expect(metric('Sessions')).toBe('4');
  });
});

describe('Concept honesty and local dashboard arrangement', () => {
  it('shows an analysis contract instead of calculated correlations without data', async () => {
    await portal('analytics', 'correlations');
    expect(screen.getByRole('heading', { name: 'Correlation matrix' })).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText(/No calculated result or sample-size guarantee/)).toBeTruthy();
  });
  it('shows provider setup instead of fabricated weather', async () => {
    await portal('current', 'weather');
    expect(screen.getByRole('heading', { name: 'Weather connection' })).toBeTruthy();
    expect(document.querySelector('.scope-badge > span').textContent).toBe('SETUP');
    expect(screen.queryByRole('img')).toBeNull();
  });
  it('preserves local widget ordering between Arrange and Saved views', async () => {
    await portal('dashboards', 'arrange');
    fireEvent.click(screen.getByRole('button', { name: 'Move Priorities earlier' }));
    await navigate('dashboards', 'saved');
    expect(document.querySelector('.dashboard-layout-row strong').textContent).toBe('1. Priorities');
  });
  it('uses skill-specific artifacts rather than reusing project cards', async () => {
    await portal('skills', 'list');
    expect(screen.getByRole('table', { name: 'Skill library' })).toBeTruthy();
    expect(screen.getByText('Software foundations')).toBeTruthy(); expect(screen.queryByText('A consistent morning rhythm')).toBeNull();
    await navigate('skills', 'radar'); expect(screen.getByRole('img', { name: 'Illustrative practice coverage by skill' })).toBeTruthy();
    await navigate('skills', 'history'); expect(screen.getByRole('table', { name: 'Skill history' })).toBeTruthy();
  });
});
