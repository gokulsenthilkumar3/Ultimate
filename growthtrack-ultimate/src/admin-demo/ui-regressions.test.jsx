import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminDemo from './AdminDemo';
import { demoHref } from './catalog';
import { Modal, RecordsTable } from './components';
import { ScreenBoundary } from './screens';
import CalendarScreen from './screens/CalendarScreen';
import FocusTimer from './screens/FocusTimer';
import PortfolioScreen from './screens/PortfolioScreen';
import { statusTone } from './screens/screenHelpers';
import { calendarDays, moveCalendar } from './models/calendarModel';
import { chartDates, chartGeometry } from './models/chartModel';
import { REVIEW_VERSION } from './models/workspaceModel';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  window.scrollTo = vi.fn();
});
beforeEach(() => { localStorage.clear(); window.innerWidth = 1440; window.innerHeight = 900; });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

async function ready() {
  await waitFor(() => expect(screen.getByRole('button', { name: /Approve this view|View approved/ }).disabled).toBe(false), { timeout: 5000 });
}
async function portal(id, view) {
  window.location.hash = demoHref(id, view);
  render(<AdminDemo />); await ready();
}
async function navigate(id, view) {
  act(() => { window.location.hash = demoHref(id, view); window.dispatchEvent(new HashChangeEvent('hashchange')); });
  await ready();
}

describe('Sample calendar dates remain valid across every boundary', () => {
  it('uses the real November date for a week crossing out of October', () => {
    const add = vi.fn(); render(<CalendarScreen view="week" addRecord={add} openRecord={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sunday, 1 November 2026' }));
    expect(add).toHaveBeenCalledWith('calendar event', undefined, '2026-11-01');
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(screen.getByRole('heading', { name: '2 Nov – 8 Nov 2026' })).toBeTruthy();
  });
  it('handles December/January and leap years without impossible dates', () => {
    expect(moveCalendar('2026-12-31', 'month', 1)).toBe('2027-01-01');
    expect(moveCalendar('2027-01-01', 'month', -1)).toBe('2026-12-01');
    expect(calendarDays('2028-02-20').filter(date => date.startsWith('2028-02-'))).toHaveLength(29);
    expect(calendarDays('2027-02-20').filter(date => date.startsWith('2027-02-'))).toHaveLength(28);
    expect(calendarDays('2026-10-28', 'week')).toEqual(['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01']);
  });
  it('shows a newly added event on its date and in the agenda', async () => {
    await portal('calendar', 'week');
    fireEvent.click(screen.getByRole('button', { name: 'Sunday, 1 November 2026' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'A local calendar event' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to demo' }));
    expect(within(screen.getByRole('button', { name: 'Sunday, 1 November 2026' })).getByText('A local calendar event')).toBeTruthy();
    await navigate('calendar', 'agenda');
    expect(screen.getByText('A local calendar event')).toBeTruthy();
  });
});

describe('Changing views preserves actual user interactions', () => {
  it('keeps completed tasks across tabs and navigation away and back', async () => {
    await portal('tasks', 'all');
    fireEvent.click(screen.getByRole('button', { name: 'Complete Review OxFin support requests' }));
    await navigate('tasks', 'completed');
    expect(screen.getByRole('button', { name: 'Reopen Review OxFin support requests' })).toBeTruthy();
    await navigate('analytics'); await navigate('tasks', 'completed');
    expect(screen.getByRole('button', { name: 'Reopen Review OxFin support requests' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reopen Review OxFin support requests' }));
    expect(screen.queryByText('Review OxFin support requests')).toBeNull();
  });
  it('puts overview quick-add tasks in the Tasks workspace', async () => {
    await portal('overview'); fireEvent.click(screen.getByRole('button', { name: 'Quick add' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'An overview task' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to demo' }));
    await navigate('tasks', 'all'); expect(screen.getByText('An overview task')).toBeTruthy();
  });
  it('keeps note edits when moving between the editor and other pages', async () => {
    await portal('notes', 'editor');
    fireEvent.change(screen.getByLabelText('Note body'), { target: { value: 'A note edited in this session.' } });
    await navigate('notes', 'all'); expect(screen.getByText('A note edited in this session.')).toBeTruthy();
    await navigate('overview'); await navigate('notes', 'editor');
    expect(screen.getByLabelText('Note body').value).toBe('A note edited in this session.');
  });
  it('retains the selected currency and period across Forex views', async () => {
    await portal('forex', 'forecast');
    fireEvent.click(screen.getByRole('button', { name: 'Select EUR / INR' }));
    fireEvent.change(screen.getByLabelText('Market period'), { target: { value: '7 days' } });
    await navigate('forex', 'volatility');
    expect(screen.getByRole('button', { name: 'Select EUR / INR' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Market period').value).toBe('7 days');
    expect(screen.getByRole('img', { name: 'EUR / INR sample volatility' })).toBeTruthy();
  });
  it('filters completed goals instead of relabelling every card', async () => {
    await portal('goals', 'completed');
    expect(screen.getByRole('heading', { name: 'Make room for family' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'A consistent morning rhythm' })).toBeNull();
  });
});

describe('Customer details and search', () => {
  it('retains support notes when a customer profile is closed and reopened', async () => {
    await portal('customers');
    fireEvent.click(screen.getByRole('button', { name: 'Open Maya Raman' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Support notes' }));
    fireEvent.change(screen.getByLabelText('Internal sample note'), { target: { value: 'Follow up on the sample request.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add local note' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Maya Raman' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Support notes' }));
    expect(screen.getByText('Follow up on the sample request.')).toBeTruthy();
  });
  it('supports roving keyboard focus in the customer tabs', async () => {
    await portal('customers'); fireEvent.click(screen.getByRole('button', { name: 'Open Maya Raman' }));
    const profile = screen.getByRole('tab', { name: 'Profile' }); profile.focus();
    fireEvent.keyDown(profile, { key: 'End' });
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Support notes' }));
    expect(screen.getByRole('tab', { name: 'Support notes' }).getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(document.activeElement, { key: 'Home' }); expect(document.activeElement).toBe(profile);
  });
  it('matches email addresses without also showing a no-results state', async () => {
    await portal('customers'); fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    fireEvent.change(screen.getByRole('textbox', { name: 'Search pages, customers, tasks and notes' }), { target: { value: '  maya@example.test  ' } });
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Maya Raman')).toBeTruthy();
    expect(within(dialog).queryByText('No results yet')).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: /Maya Raman/ }));
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Customer profile' }));
  });
  it('finds an app by its existing alias', async () => {
    await portal('customers'); fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    fireEvent.change(screen.getByRole('textbox', { name: 'Search pages, customers, tasks and notes' }), { target: { value: 'NiftyLens' } });
    expect(within(screen.getByRole('dialog')).getByText('Equity')).toBeTruthy();
  });
  it('keeps the GrowthTrack navigation group active on a child page', async () => {
    await portal('sleep');
    expect(screen.getByRole('link', { name: 'GrowthTrack', exact: true }).getAttribute('aria-current')).toBe('location');
  });
  it.each(['Inactive', 'Invited', 'Incomplete', 'Disconnected'])('%s does not appear as a successful account status', status => {
    expect(statusTone(status)).toBe('neutral');
  });
});

describe('Dialog and navigation focus', () => {
  it('locks background scrolling, focuses the field and restores the opener', async () => {
    await portal('customers');
    const opener = screen.getByRole('button', { name: /Search anything/ }); opener.focus(); fireEvent.click(opener);
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Search pages, customers, tasks and notes' }));
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    expect(document.activeElement).toBe(opener); expect(document.body.style.overflow).toBe('');
  });
  it('handles the native dialog cancel event through the same close path', () => {
    const close = vi.fn(); render(<Modal title="Cancel test" onClose={close}><p>Sample dialog</p></Modal>);
    const event = new Event('cancel', { cancelable: true });
    fireEvent(screen.getByRole('dialog'), event); expect(close).toHaveBeenCalledOnce(); expect(event.defaultPrevented).toBe(true);
  });
  it('keeps hidden mobile navigation out of focus and traps focus while it is open', async () => {
    window.innerWidth = 390; await portal('customers');
    expect(document.getElementById('main-navigation').hasAttribute('inert')).toBe(true);
    const toggle = screen.getByRole('button', { name: 'Toggle navigation' }); toggle.focus(); fireEvent.click(toggle);
    const navigation = screen.getByRole('dialog', { name: 'Main navigation' });
    const first = within(navigation).getByRole('button', { name: 'Close navigation' });
    const last = within(navigation).getByRole('link', { name: 'Help & documentation' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true }); expect(document.activeElement).toBe(last);
    fireEvent.keyDown(last, { key: 'Tab' }); expect(document.activeElement).toBe(first);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.getElementById('main-navigation').hasAttribute('inert')).toBe(true);
    expect(document.activeElement).toBe(toggle); expect(document.body.style.overflow).toBe('');
  });
  it('does not reopen the drawer after desktop-to-mobile resizing', async () => {
    window.innerWidth = 390; await portal('customers'); fireEvent.click(screen.getByRole('button', { name: 'Toggle navigation' }));
    act(() => { window.innerWidth = 1440; window.dispatchEvent(new Event('resize')); });
    act(() => { window.innerWidth = 390; window.dispatchEvent(new Event('resize')); });
    expect(document.getElementById('main-navigation').hasAttribute('inert')).toBe(true);
    expect(document.body.style.overflow).toBe('');
  });
});

describe('Empty views, meaningful actions and validation', () => {
  it('clears a status filter that has no customers instead of offering a broken retry', async () => {
    await portal('finsync'); fireEvent.click(screen.getByRole('button', { name: 'Invited', exact: true }));
    expect(screen.getByRole('heading', { name: 'No records in this view' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' })); expect(screen.getByText('Aarav Mehta')).toBeTruthy();
  });
  it('trims table searches and provides an effective clear action', () => {
    render(<RecordsTable rows={[{ name: 'Aarav' }, { name: 'Maya' }]} columns={[{ key: 'name', label: 'Name' }]} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '  Aarav  ' } }); expect(screen.queryByText('Maya')).toBeNull();
    fireEvent.change(input, { target: { value: 'missing' } }); fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByText('Maya')).toBeTruthy(); expect(input.value).toBe('');
  });
  it('reports whitespace-only names instead of silently refusing to save', async () => {
    await portal('customers'); fireEvent.click(screen.getAllByRole('button', { name: 'Add sample customer' })[0]);
    const dialog = screen.getByRole('dialog'); fireEvent.change(within(dialog).getByLabelText('Customer name'), { target: { value: '   ' } });
    fireEvent.change(within(dialog).getByLabelText('Sample email'), { target: { value: 'sample@example.test' } });
    fireEvent.submit(within(dialog).getByRole('button', { name: 'Add to demo' }).closest('form'));
    expect(screen.getByRole('alert').textContent).toContain('Enter a name or title');
  });
  it('sorts relative customer activity chronologically', async () => {
    await portal('customers');
    const table = screen.getByRole('table', { name: 'Customer directory' });
    const sort = within(table).getByRole('button', { name: 'Last active' });
    fireEvent.click(sort);
    expect(within(within(table).getAllByRole('row')[1]).getByText('Tara Kapoor')).toBeTruthy();
    fireEvent.click(sort);
    expect(within(within(table).getAllByRole('row')[1]).getByText('Aarav Mehta')).toBeTruthy();
  });
  it('keeps purchased shopping items out of the planned view', async () => {
    await portal('shopping', 'planned');
    const table = screen.getByRole('table');
    expect(within(table).getByText('Desk lamp')).toBeTruthy(); expect(within(table).queryByText('Running shoes')).toBeNull();
    await navigate('shopping', 'purchased');
    expect(within(screen.getByRole('table')).getByText('Running shoes')).toBeTruthy();
    expect(within(screen.getByRole('table')).queryByText('Desk lamp')).toBeNull();
  });
  it('reports a duplicate customer within the same product', async () => {
    await portal('customers'); fireEvent.click(screen.getAllByRole('button', { name: 'Add sample customer' })[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Customer name'), { target: { value: 'Another name' } });
    fireEvent.change(within(dialog).getByLabelText('Sample email'), { target: { value: 'MAYA@example.test' } });
    fireEvent.change(within(dialog).getByLabelText('Product'), { target: { value: 'OxFin' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to demo' })); expect(screen.getByRole('alert').textContent).toContain('already exists');
  });
  it.each(['welcome', 'login', 'privacy', 'terms', 'about', 'help', 'profile', 'analytics'])('%s has no unrelated add-record action', async id => {
    await portal(id); expect(screen.queryByRole('button', { name: 'Add sample entry' })).toBeNull();
  });
  it('does not reuse approvals from the previous design revision', async () => {
    localStorage.setItem('growthtrack-admin-design-2026-10-28-v1', JSON.stringify({ 'customers:customers:light:populated:1440x900': { page: 'customers', status: 'approved' } }));
    await portal('customers'); expect(REVIEW_VERSION).not.toBe('growthtrack-admin-design-2026-10-28-v1');
    expect(screen.getByRole('button', { name: 'Approve this view' })).toBeTruthy();
  });
});

describe('Charts, portfolio tabs, and the focus timer', () => {
  it.each([['7 days', '2026-10-22'], ['30 days', '2026-09-29'], ['90 days', '2026-07-31']])('%s shows the correct period', (range, start) => {
    const dates = chartDates(range); expect(dates[0].iso).toBe(start); expect(dates.at(-1).iso).toBe('2026-10-28');
  });
  it('scales chart values around the selected quote', () => {
    for (const quote of [0.56, 84.08, 24832.45]) {
      const data = chartGeometry('30 days', quote);
      expect(data.ticks[0].value).toBeGreaterThan(quote); expect(data.ticks.at(-1).value).toBeLessThan(quote);
      expect(data.coordinates.every(([x, y]) => x >= 100 && x <= 700 && y >= 40 && y <= 194)).toBe(true);
    }
  });
  it('shows allocation and history as distinct portfolio views', () => {
    const { rerender } = render(<PortfolioScreen view="allocation" openRecord={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Portfolio allocation' })).toBeTruthy(); expect(screen.getAllByRole('progressbar')).toHaveLength(4);
    rerender(<PortfolioScreen view="history" openRecord={vi.fn()} />);
    expect(screen.getByRole('table', { name: 'Portfolio history' })).toBeTruthy(); expect(screen.queryByRole('progressbar')).toBeNull();
  });
  it('runs, pauses, resumes and resets a real local countdown', () => {
    vi.useFakeTimers(); render(<FocusTimer />);
    fireEvent.click(screen.getByRole('button', { name: 'Start sample session' })); act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('timer').textContent).toBe('24:58');
    fireEvent.click(screen.getByRole('button', { name: 'Pause sample session' })); act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByRole('timer').textContent).toBe('24:58');
    fireEvent.click(screen.getByRole('button', { name: 'Resume sample session' })); act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByRole('timer').textContent).toBe('24:57'); fireEvent.click(screen.getByRole('button', { name: 'Reset timer' }));
    expect(screen.getByRole('timer').textContent).toBe('25:00');
  });
  it('contains a failed page and recovers on a different view', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onError = vi.fn(); function Broken() { throw new Error('Simulated render failure'); }
    const { rerender } = render(<ScreenBoundary resetKey="a" onError={onError}><Broken /></ScreenBoundary>);
    expect(screen.getByRole('heading', { name: 'This page couldn’t be opened' })).toBeTruthy(); expect(onError).toHaveBeenCalled();
    rerender(<ScreenBoundary resetKey="b" onError={onError}><p>Recovered view</p></ScreenBoundary>);
    expect(screen.getByText('Recovered view')).toBeTruthy();
  });
});
