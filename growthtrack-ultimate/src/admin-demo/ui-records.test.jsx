import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminDemo from './AdminDemo';
import { Modal } from './components';
import { demoHref, PAGE_BY_ID, reviewKey } from './catalog';
import { normaliseEntry, validateEntry } from './models/entryModel';
import { createFocusSession, focusRemaining, toggleFocus } from './models/focusModel';
import { REVIEW_VERSION, restoreReviews } from './models/reviewModel';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  window.scrollTo = vi.fn();
});
beforeEach(() => { localStorage.clear(); window.innerWidth = 1440; window.innerHeight = 900; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function ready() {
  // The first lazy import can include Vite transform time; this is a readiness check, not a speed benchmark.
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
function metric(label) { return screen.getByText(label, { selector: '.metric-label' }).closest('article').querySelector('.metric-value').textContent; }
function openEntry(label) { fireEvent.click(screen.getAllByRole('button', { name: label })[0]); return within(screen.getByRole('dialog')); }
function fill(dialog, fields) {
  for (const [label, value] of Object.entries(fields)) fireEvent.change(dialog.getByLabelText(label), { target: { value } });
  fireEvent.click(dialog.getByRole('button', { name: 'Add to demo' }));
}

describe('Finance entries update their native views and calculated summaries', () => {
  it('adds an expense with cents and carries its totals to finance and analytics', async () => {
    await portal('transactions', 'all');
    fill(openEntry('Add sample transaction'), { Title: 'Local train ticket', 'Amount (₹)': '149.50', Category: 'Transport' });
    const table = screen.getByRole('table', { name: 'Transactions' });
    expect(within(table).getByText('Local train ticket')).toBeTruthy();
    expect(within(table).getByText('(₹ 149.50)')).toBeTruthy();
    expect(metric('Expenses')).toBe('₹ 36,529.50');
    expect(metric('Net balance')).toBe('₹ 48,470.50');
    await navigate('transactions', 'income'); expect(screen.queryByText('Local train ticket')).toBeNull();
    await navigate('finance'); expect(screen.getByText('Local train ticket')).toBeTruthy();
    expect(metric('Expenses')).toBe('₹ 36,529.50');
    await navigate('financeAnalytics'); expect(metric('Expenses')).toBe('₹ 36,529.50');
  });
  it('adds income separately from expenses', async () => {
    await portal('transactions', 'income');
    fill(openEntry('Add sample transaction'), { Title: 'Sample refund', 'Amount (₹)': '500', Direction: 'Income' });
    expect(screen.getByText('Sample refund')).toBeTruthy(); expect(metric('Income')).toBe('₹ 85,500.00');
    expect(metric('Expenses')).toBe('₹ 0.00'); // The income view excludes expenses from its summary.
    await navigate('transactions', 'expenses'); expect(screen.queryByText('Sample refund')).toBeNull();
  });
  it('updates the budget limit and current history without rewriting the past', async () => {
    await portal('budgeting');
    fill(openEntry('Add sample category'), { Title: 'Travel savings', 'Monthly limit (₹)': '2500' });
    expect(screen.getByRole('heading', { name: 'Travel savings' })).toBeTruthy();
    expect(metric('Monthly budget')).toBe('₹ 47,500.00'); expect(metric('Categories')).toBe('5');
    await navigate('budgeting', 'history');
    const table = screen.getByRole('table', { name: 'Budget history' });
    const current = within(table).getByText('October 2026').closest('tr');
    const past = within(table).getByText('September 2026').closest('tr');
    expect(within(current).getByText('₹ 47,500.00')).toBeTruthy();
    expect(within(past).getByText('₹ 44,000.00')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Travel savings' })).toBeNull();
  });
  it('keeps archived subscriptions out of current costs and shares new renewals with trends', async () => {
    await portal('subscriptions', 'active');
    fill(openEntry('Add sample subscription'), { Title: 'Sample design library', 'Monthly cost (₹)': '399', 'Next renewal': '2026-11-15' });
    expect(metric('Monthly recurring')).toBe('₹ 2,646.00'); expect(metric('Active plans')).toBe('4');
    await navigate('subscriptions', 'archived');
    expect(screen.getByText('Previous magazine plan')).toBeTruthy();
    expect(screen.queryByText('Music subscription')).toBeNull(); expect(screen.queryByText('Sample design library')).toBeNull();
    await navigate('subscriptions', 'upcoming'); expect(screen.getByText('Sample design library')).toBeTruthy();
    await navigate('financeTrends', 'recurring'); expect(screen.getByText('Sample design library')).toBeTruthy();
    expect(metric('Monthly recurring')).toBe('₹ 2,646.00');
  });
  it('excludes a distant renewal from the next 30 days without hiding its active plan', async () => {
    await portal('subscriptions', 'active');
    fill(openEntry('Add sample subscription'), { Title: 'Later renewal', 'Monthly cost (₹)': '200', 'Next renewal': '2027-03-01' });
    expect(metric('Active plans')).toBe('4'); expect(metric('Upcoming renewals')).toBe('3');
    await navigate('subscriptions', 'upcoming'); expect(screen.queryByText('Later renewal')).toBeNull();
    await navigate('subscriptions', 'active'); expect(screen.getByText('Later renewal')).toBeTruthy();
  });
  it('uses the chosen shopping status and value in its summaries', async () => {
    await portal('shopping', 'planned');
    fill(openEntry('Add sample item'), { Title: 'Purchased sample book', 'Amount (₹)': '650', 'Item status': 'Purchased' });
    expect(screen.queryByText('Purchased sample book')).toBeNull();
    expect(metric('Items')).toBe('4'); expect(metric('Purchased value')).toBe('₹ 4,850.00');
    expect(metric('Planned value')).toBe('₹ 4,200.00');
    await navigate('shopping', 'purchased'); expect(screen.getByText('Purchased sample book')).toBeTruthy();
    expect(screen.queryByText('Desk lamp')).toBeNull();
  });
  it('shows different SIP projection and comparison tables using the selected assumptions', async () => {
    await portal('sip', 'projection');
    expect(screen.getByRole('table', { name: 'SIP yearly projection' })).toBeTruthy();
    fireEvent.change(screen.getByRole('slider', { name: 'Assumed annual return (%)' }), { target: { value: '0' } });
    const table = screen.getByRole('table', { name: 'SIP yearly projection' });
    const yearOne = within(table).getAllByRole('row')[1];
    expect(within(yearOne).getAllByText('₹ 1,20,000.00')).toHaveLength(2);
    await navigate('sip', 'comparison');
    expect(screen.queryByRole('table', { name: 'SIP yearly projection' })).toBeNull();
    expect(within(screen.getByRole('table', { name: 'SIP assumption comparison' })).getByText('0%')).toBeTruthy();
  });
});

describe('Family views use the same scoped sample records', () => {
  it('adds a member to the visible member list without inventing a relationship', async () => {
    await portal('family');
    fill(openEntry('Add sample member'), { Title: 'Leela Example' });
    expect(metric('Family members')).toBe('7'); expect(screen.getByText('Leela Example')).toBeTruthy();
    expect(screen.getByText('Unlinked member')).toBeTruthy();
    await navigate('family', 'timeline'); expect(screen.getByRole('heading', { name: 'Leela Example added' })).toBeTruthy();
  });
  it('shares a family event and its date with the workspace calendar', async () => {
    await portal('family');
    fill(openEntry('Add sample event'), { Title: 'Shared family picnic', 'Record date': '2026-11-21', Notes: 'At the sample park' });
    expect(metric('Upcoming events')).toBe('4');
    const event = screen.getByText('Shared family picnic').closest('button');
    expect(within(event).getByText('21')).toBeTruthy();
    await navigate('calendar', 'agenda');
    const shared = screen.getByText('Shared family picnic').closest('button');
    expect(within(shared).getByText('21')).toBeTruthy(); expect(screen.getByText('Anya’s birthday')).toBeTruthy();
    await navigate('family', 'timeline'); expect(screen.getByText('Shared family picnic')).toBeTruthy();
  });
  it('limits the family vault to family files and collections', async () => {
    await portal('family', 'vault');
    const table = screen.getByRole('table');
    expect(within(table).getByText('Family certificates.pdf')).toBeTruthy();
    expect(within(table).getByText('Family contacts.md')).toBeTruthy();
    expect(within(table).getAllByRole('row')).toHaveLength(Number(metric('Vault items')) + 1);
    expect(within(table).queryByText('GrowthTrack')).toBeNull();
    expect(within(table).queryByText('Finance')).toBeNull();
  });
});

describe('Navigation, preferences and dialog boundaries', () => {
  it('preserves the focus countdown when visiting other pages', async () => {
    let now = Date.now(); vi.spyOn(Date, 'now').mockImplementation(() => now);
    await portal('timesheet');
    fireEvent.click(screen.getByRole('button', { name: 'Start sample session' }));
    await navigate('overview'); now += 65000;
    await navigate('timesheet'); expect(screen.getByRole('timer').textContent).toBe('23:55');
    fireEvent.click(screen.getByRole('button', { name: 'Pause sample session' }));
    await navigate('overview'); now += 60000;
    await navigate('timesheet'); expect(screen.getByRole('timer').textContent).toBe('23:55');
  });
  it('calculates delayed ticks from the wall clock and completes at zero', () => {
    const session = toggleFocus(createFocusSession(), 1000);
    expect(focusRemaining(session, 91250)).toBe(1410);
    expect(focusRemaining(session, 1501000)).toBe(0);
    const paused = toggleFocus(session, 91250);
    expect(focusRemaining(paused, 400000)).toBe(1410);
    expect(toggleFocus(paused, 400000).deadline).toBe(1810000);
  });
  it('restores information density after reloading the preview', async () => {
    await portal('profile', 'appearance');
    fireEvent.change(screen.getByLabelText('Information density'), { target: { value: 'compact' } });
    expect(JSON.parse(localStorage.getItem('gt-demo-density'))).toBe('compact');
    cleanup(); render(<AdminDemo />); await ready();
    expect(screen.getByLabelText('Information density').value).toBe('compact');
    expect(document.querySelector('.portal').dataset.density).toBe('compact');
  });
  it('closes an open form when browser history changes the page', async () => {
    await portal('family'); openEntry('Add sample member');
    await navigate('customers');
    expect(screen.queryByRole('dialog')).toBeNull(); expect(document.body.style.overflow).toBe('');
  });
  it.each([['finsync', 'FinSync'], ['oxfin', 'OxFin']])('scopes new customers to %s', async (id, product) => {
    await portal(id); const dialog = openEntry('Add sample customer');
    expect(within(dialog.getByLabelText('Product')).getAllByRole('option').map(option => option.value)).toEqual([product]);
    fill(dialog, { 'Customer name': 'Scoped example', 'Sample email': 'scoped@example.test' });
    expect(screen.getByText('Scoped example')).toBeTruthy();
    await navigate(id === 'finsync' ? 'oxfin' : 'finsync'); expect(screen.queryByText('Scoped example')).toBeNull();
  });
  it('ignores a click on dialog padding and dismisses an outside click', () => {
    const close = vi.fn(); render(<Modal title="Boundary test" onClose={close}><p>Dialog content</p></Modal>);
    const dialog = screen.getByRole('dialog');
    vi.spyOn(dialog, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 100, right: 600, bottom: 500 });
    fireEvent.click(dialog, { clientX: 595, clientY: 450 }); expect(close).not.toHaveBeenCalled();
    fireEvent.click(dialog, { clientX: 90, clientY: 450 }); expect(close).toHaveBeenCalledOnce();
  });
});

describe('Entry and saved-review validation', () => {
  it.each(['-1', '0', '1.001', 'Infinity', '1000000001', ''])('rejects invalid financial amount %s', amount => {
    expect(validateEntry('transaction', { amount, direction: 'Expense', date: '2026-10-28' })).not.toBe('');
  });
  it('rejects impossible dates and preserves valid cents', () => {
    expect(validateEntry('family event', { date: '2026-02-31' })).toContain('valid date');
    expect(validateEntry('family event', { date: '2028-02-29' })).toBe('');
    expect(normaliseEntry('transaction', { title: ' Sample ', amount: '12.34', category: ' ', direction: 'Expense', date: '2026-10-28' }, 'transactions', 'local')).toMatchObject({ title: 'Sample', amount: 12.34, category: 'Other', origin: 'transactions' });
  });
  const page = PAGE_BY_ID.customers;
  const key = reviewKey(page, 'customers', 'light', 'populated', '1440x900');
  const entry = { version: REVIEW_VERSION, page: page.id, path: page.path, view: 'customers', theme: 'light', state: 'populated', density: 'comfortable', status: 'approved', note: '', viewport: { width: 1440, height: 900 }, reviewedAt: '2026-10-28T08:00:00.000Z' };
  it('restores a valid current review and ignores a malformed neighbour', () => {
    expect(restoreReviews({ [key]: entry, broken: null })).toEqual({ [key]: entry });
  });
  it.each([
    { version: 'growthtrack-admin-design-2026-10-28-v2' }, { page: '__proto__' }, { path: '/wrong' }, { view: 'missing' },
    { theme: 'sepia' }, { state: 'unknown' }, { status: 'done' }, { note: null }, { note: 'x'.repeat(4001) },
    { viewport: { width: -1, height: 900 } }, { viewport: { width: 1440.5, height: 900 } }, { reviewedAt: 'invalid' },
  ])('ignores invalid saved approval %#', patch => {
    expect(restoreReviews({ [key]: { ...entry, ...patch } })).toEqual({});
  });
  it('ignores mismatched review keys and invalid storage roots', () => {
    expect(restoreReviews({ wrong: entry })).toEqual({});
    for (const value of [null, [], 'invalid', 3]) expect(restoreReviews(value)).toEqual({});
  });
  it('does not crash or count corrupt saved reviews when opening the portal', async () => {
    localStorage.setItem(REVIEW_VERSION, JSON.stringify({ bad: null, wrong: entry }));
    await portal('customers'); expect(screen.getByRole('button', { name: 'Approve this view' })).toBeTruthy();
  });
});
