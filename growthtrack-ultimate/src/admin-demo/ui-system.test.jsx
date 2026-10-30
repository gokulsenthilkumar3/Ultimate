import React, { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminDemo from './AdminDemo';
import { RecordsTable } from './components';
import PhysiqueScreen from './screens/PhysiqueScreen';
import { PAGE_BY_ID, PAGE_VIEWS, demoHref, reviewKey, reviewTargets } from './catalog';
import { PHYSIQUE_STORAGE_KEY, createPhysiqueSession, physiqueIsDirty, physiqueSnapshot, restorePhysiqueSession, updatePhysiqueField } from './models/physiqueModel';
import { REVIEW_VERSION, compactReviews, nextPendingReview, restoreReviews, reviewCoverage } from './models/reviewModel';
import { tablePage } from './models/tableModel';

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
async function portal(id, view) { window.location.hash = demoHref(id, view); render(<AdminDemo />); await ready(); }
async function navigate(id, view) { act(() => { window.location.hash = demoHref(id, view); window.dispatchEvent(new HashChangeEvent('hashchange')); }); await ready(); }
const rows = Array.from({ length: 10000 }, (_, index) => ({ id: `R-${index}`, title: `Sample ${String(index).padStart(5, '0')}`, value: 10000 - index }));
const columns = [{ key: 'title', label: 'Name' }, { key: 'value', label: 'Value' }];

describe('Bounded shared tables at 10,000 synthetic records', () => {
  it('mounts 25 records and exposes the next page without mounting the whole collection', () => {
    render(<RecordsTable rows={rows} columns={columns} label="Scale sample" />);
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(26);
    expect(screen.getByText('1–25 of 10000 records')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next page of Scale sample' }));
    expect(screen.getByText('Sample 00025')).toBeTruthy(); expect(screen.queryByText('Sample 00000')).toBeNull();
    expect(screen.getByText('26–50 of 10000 records')).toBeTruthy();
  });
  it('sorts the entire result before taking a page and resets navigation on search', () => {
    render(<RecordsTable rows={rows} columns={columns} label="Scale sample" />);
    fireEvent.click(screen.getByRole('button', { name: 'Next page of Scale sample' }));
    fireEvent.click(screen.getByRole('button', { name: 'Value', exact: true }));
    expect(within(screen.getByRole('table')).getAllByRole('row')[1].textContent).toContain('Sample 09999');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' Sample 09876 ' } });
    expect(screen.getByText('Sample 09876')).toBeTruthy(); expect(screen.getByText('1–1 of 1 record')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Previous page of Scale sample' }).disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'missing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(26);
  });
  it('bounds a larger page choice and clamps navigation when the source shrinks', () => {
    const { rerender } = render(<RecordsTable rows={rows} columns={columns} label="Scale sample" />);
    fireEvent.change(screen.getByLabelText('Rows per page for Scale sample'), { target: { value: '100' } });
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(101);
    fireEvent.click(screen.getByRole('button', { name: 'Next page of Scale sample' }));
    rerender(<RecordsTable rows={rows.slice(0, 2)} columns={columns} label="Scale sample" />);
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('Sample 00000')).toBeTruthy();
  });
  it('handles the last partial page, zero results and invalid page settings', () => {
    expect(tablePage(rows.slice(0, 51), columns, { page: 100 }).rows).toHaveLength(1);
    expect(tablePage(rows, columns, { pageSize: 10000 }).rows).toHaveLength(25);
    expect(tablePage([], columns, { page: -20 })).toMatchObject({ start: 0, end: 0, page: 0, pages: 1 });
    expect(tablePage(rows, columns, { query: 'nothing' }).rows).toHaveLength(0);
  });
  it('keeps missing values last in either sort direction', () => {
    const mixed = [{ value: null }, { value: 0 }, { value: 2 }];
    expect(tablePage(mixed, columns, { sort: 'value' }).rows.map(row => row.value)).toEqual([0, 2, null]);
    expect(tablePage(mixed, columns, { sort: 'value', ascending: false }).rows.map(row => row.value)).toEqual([2, 0, null]);
  });
});

describe('Review coverage across themes, densities, states and viewports', () => {
  const scope = { theme: 'light', state: 'populated', density: 'comfortable', viewport: { width: 1440, height: 900 } };
  const record = (page, view, target = scope, status = 'approved') => ({ version: REVIEW_VERSION, page: page.id, path: page.path, view, ...target, status, note: '', reviewedAt: '2026-10-28T08:00:00.000Z' });
  it('has unique density-aware targets and scopes completion to the exact viewport', () => {
    const targets = reviewTargets();
    expect(targets).toHaveLength(PAGE_VIEWS.length * 2 * 2 * 6);
    expect(new Set(targets.map(target => target.key)).size).toBe(targets.length);
    const page = PAGE_BY_ID.customers, entry = record(page, 'customers');
    const reviews = { [reviewKey(page, 'customers', 'light', 'populated', '1440x900')]: entry };
    expect(reviewCoverage(reviews, scope).approved).toBe(1);
    expect(reviewCoverage(reviews, { ...scope, density: 'compact' }).approved).toBe(0);
    expect(reviewCoverage(reviews, { ...scope, theme: 'dark' }).approved).toBe(0);
    expect(reviewCoverage(reviews, { ...scope, viewport: { width: 390, height: 844 } }).approved).toBe(0);
  });
  it('restores and counts a complete 24,120-case synthetic review matrix without cross-scope inflation', () => {
    const reviews = {};
    for (const viewport of [{ width: 1024, height: 768 }, { width: 1280, height: 800 }, scope.viewport, { width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
      for (const target of reviewTargets()) {
        const page = PAGE_BY_ID[target.page], targetScope = { ...target, viewport };
        const key = reviewKey(page, target.view, target.theme, target.state, `${viewport.width}x${viewport.height}`, target.density);
        reviews[key] = record(page, target.view, targetScope);
      }
    }
    expect(Object.keys(reviews)).toHaveLength(PAGE_VIEWS.length * 24 * 5);
    const restored = restoreReviews(JSON.parse(JSON.stringify(reviews)));
    expect(Object.keys(restored)).toHaveLength(Object.keys(reviews).length);
    const compact = compactReviews(restored);
    expect(Object.keys(restoreReviews(JSON.parse(JSON.stringify(compact))))).toHaveLength(Object.keys(reviews).length);
    expect(JSON.stringify(compact).length).toBeLessThan(JSON.stringify(reviews).length / 2);
    const coverage = reviewCoverage(restored, scope);
    expect(coverage.approved).toBe(PAGE_VIEWS.length); expect(coverage.completedPages).toBe(65);
    expect(nextPendingReview(coverage, 'customers', 'customers')).toBeNull();
  });
  it('does not call a page complete when only one of its tabs is approved', () => {
    const page = PAGE_BY_ID.customers;
    const reviews = { [reviewKey(page, 'customers', 'light', 'populated', '1440x900')]: record(page, 'customers') };
    const coverage = reviewCoverage(reviews, scope);
    expect(coverage.completedPages).toBe(0);
    expect(nextPendingReview(coverage, page.id, 'customers').view).toBe('activity');
  });
  it('shows area/status filters with a clear reset when no pages match', async () => {
    await portal('customers'); fireEvent.click(screen.getByRole('button', { name: /All pages & review/ }));
    fireEvent.change(screen.getByLabelText('Review status'), { target: { value: 'approved' } });
    expect(screen.getByText('No pages match these filters')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear review filters' }));
    fireEvent.change(screen.getByLabelText('Review product area'), { target: { value: 'customers' } });
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('FinSync customers')).toBeTruthy(); expect(dialog.queryByText('Family Connect')).toBeNull();
  });
  it('keeps the selected error state when navigating through the review catalog', async () => {
    await portal('customers');
    fireEvent.change(screen.getByLabelText('Preview state'), { target: { value: 'error' } });
    fireEvent.click(screen.getByRole('button', { name: /All pages & review/ }));
    fireEvent.change(screen.getByLabelText('Filter pages'), { target: { value: 'Family' } });
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Open Family Connect:/ }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Family Connect couldn’t be loaded' })).toBeTruthy());
    expect(screen.getByLabelText('Preview state').value).toBe('error');
  });
  it('records feedback against the viewport on opening, even if the window is resized', async () => {
    await portal('customers'); fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    fireEvent.change(screen.getByLabelText('Your feedback'), { target: { value: 'Check the table spacing.' } });
    act(() => { window.innerWidth = 390; window.dispatchEvent(new Event('resize')); });
    fireEvent.click(screen.getByRole('button', { name: 'Save feedback locally' }));
    const records = restoreReviews(JSON.parse(localStorage.getItem(REVIEW_VERSION)));
    expect(records[reviewKey(PAGE_BY_ID.customers, 'customers', 'light', 'populated', '1440x900')].viewport.width).toBe(1440);
    expect(records[reviewKey(PAGE_BY_ID.customers, 'customers', 'light', 'populated', '390x900')]).toBeUndefined();
  });
  it('requires a fresh approval after changing information density', async () => {
    await portal('profile', 'appearance'); fireEvent.click(screen.getByRole('button', { name: 'Approve this view' }));
    fireEvent.change(screen.getByLabelText('Information density'), { target: { value: 'compact' } });
    expect(screen.getByRole('button', { name: 'Approve this view' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Information density'), { target: { value: 'comfortable' } });
    expect(screen.getByRole('button', { name: 'View approved' })).toBeTruthy();
  });
  it('keeps a persistent export warning after review storage is full', async () => {
    await portal('customers');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
    fireEvent.click(screen.getByRole('button', { name: 'Approve this view' }));
    fireEvent.click(screen.getByRole('button', { name: /All pages & review/ }));
    expect(within(screen.getByRole('dialog')).getByRole('alert').textContent).toContain('Export your review before closing');
    const scopeViews = reviewTargets().filter(target => target.theme === 'light' && target.state === 'populated' && target.density === 'comfortable').length;
    expect(within(screen.getByRole('dialog')).getByText(`1 / ${scopeViews}`)).toBeTruthy();
  });
  it('ignores malformed compact records and obsolete storage revisions', () => {
    expect(restoreReviews({ format: 'growthtrack-ui-review-store', version: REVIEW_VERSION, entries: [null, 3, ['wrong'], ['customers:customers:light:populated:sepia:1440x900', 'approved', '', '2026-10-28T08:00:00Z']] })).toEqual({});
    expect(restoreReviews({ format: 'growthtrack-ui-review-store', version: REVIEW_VERSION, entries: null })).toEqual({});
    expect(restoreReviews({ format: 'growthtrack-ui-review-store', version: 'v3', entries: [] })).toEqual({});
  });
  it('keeps whitespace-only feedback open with a useful error', async () => {
    await portal('customers'); fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    fireEvent.change(screen.getByLabelText('Your feedback'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save feedback locally' }));
    expect(within(screen.getByRole('dialog')).getByRole('alert').textContent).toContain('Describe the change');
    expect(localStorage.getItem(REVIEW_VERSION)).toBeNull();
  });
});

describe('Physique workspace draft and local-save boundaries', () => {
  it('keeps Current and Goal independent and rejects invalid values', () => {
    const initial = createPhysiqueSession();
    const changed = updatePhysiqueField(initial, 'goal', 'waist', '90');
    expect(changed.contexts.current.waist).toBe(82); expect(changed.contexts.goal.waist).toBe(90);
    expect(initial.contexts.goal.waist).toBe(80);
    expect(updatePhysiqueField(initial, 'current', 'height', Infinity)).toBe(initial);
    expect(updatePhysiqueField(initial, 'current', '__proto__', 180)).toBe(initial);
    expect(updatePhysiqueField(initial, 'current', 'height', 1000).contexts.current.height).toBe(210);
  });
  it('retains edits across tabs and navigation, with a separate saved history', async () => {
    await portal('physique', '3d');
    fireEvent.change(screen.getByLabelText('Current waist (cm)'), { target: { value: '87' } });
    await navigate('physique', 'measurements');
    const current = within(screen.getByRole('table', { name: 'Physique measurements' })).getByText('Waist').closest('tr');
    expect(within(current).getByText('87 cm')).toBeTruthy(); expect(within(current).getByText('80 cm')).toBeTruthy();
    await navigate('overview'); await navigate('physique', '3d');
    expect(screen.getByLabelText('Current waist (cm)').value).toBe('87');
    fireEvent.click(screen.getByRole('button', { name: 'Save sample profile', exact: true }));
    expect(screen.getByText('Sample profile saved in this browser.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Current waist (cm)'), { target: { value: '89' } });
    await navigate('physique', 'history');
    expect(within(screen.getByRole('table', { name: 'Saved physique profile' })).getByText('87 cm')).toBeTruthy();
    expect(within(screen.getByRole('table', { name: 'Saved physique profile' })).queryByText('89 cm')).toBeNull();
    cleanup(); render(<AdminDemo />); await ready(); await navigate('physique', '3d');
    expect(screen.getByLabelText('Current waist (cm)').value).toBe('87');
  });
  it('leaves the draft intact and offers a download when local storage fails', async () => {
    await portal('physique', '3d');
    fireEvent.change(screen.getByLabelText('Current waist (cm)'), { target: { value: '88' } });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable'); });
    fireEvent.click(screen.getByRole('button', { name: 'Save sample profile', exact: true }));
    expect(screen.getByText(/Browser storage is unavailable/)).toBeTruthy();
    expect(screen.getByLabelText('Current waist (cm)').value).toBe('88');
    expect(screen.getByRole('button', { name: 'Save sample profile', exact: true }).disabled).toBe(false);
  });
  it('coalesces fast slider changes and updates the latest outline, with no worker or network claim', () => {
    vi.useFakeTimers();
    function Editor() { const [session, setSession] = useState(createPhysiqueSession); return <PhysiqueScreen view="3d" physiqueSession={session} onPhysiqueChange={setSession} openRecord={vi.fn()} />; }
    render(<Editor />);
    for (const value of ['83', '84', '91']) fireEvent.change(screen.getByLabelText('Current waist (cm)'), { target: { value } });
    expect(screen.getByText('Updating outline')).toBeTruthy();
    act(() => vi.advanceTimersByTime(150));
    expect(screen.getByText('Outline ready')).toBeTruthy();
    expect(within(screen.getByText('Waist', { selector: '.physique-stage-readout > span' })).getByText('91 cm')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export GLB package' }).disabled).toBe(true);
    expect(screen.getByText(/production 3D renderer is not connected/)).toBeTruthy();
  });
  it('stores only bounded semantic demo values and restores a clean saved session', () => {
    const initial = createPhysiqueSession();
    const snapshot = physiqueSnapshot(initial, '2026-10-28T08:00:00Z');
    expect(snapshot.format).toBe('growthtrack-physique-ui-demo');
    expect(physiqueIsDirty(restorePhysiqueSession(snapshot))).toBe(false);
    snapshot.contexts.current.waist = -100;
    expect(restorePhysiqueSession(snapshot).contexts.current.waist).toBe(82);
    expect(initial.contexts.current.waist).toBe(82);
  });
  it('loads a corrupt saved profile safely and never contacts customer or model services', async () => {
    localStorage.setItem(PHYSIQUE_STORAGE_KEY, JSON.stringify({ format: 'growthtrack-physique-ui-demo', version: 1, contexts: { current: { height: 'wrong' } } }));
    const fetch = vi.spyOn(globalThis, 'fetch');
    await portal('physique', '3d');
    expect(screen.getByLabelText('Current height (cm)').value).toBe('178');
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Add sample entry' })).toBeNull();
  });
});
