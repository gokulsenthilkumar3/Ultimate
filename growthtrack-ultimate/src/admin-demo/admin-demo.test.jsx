import React from 'react';
import { renderToString } from 'react-dom/server';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminDemo from './AdminDemo';
import { ScopeProvider } from './Scope';
import { screenScope } from './models/screenScope';
import { resolveScreenKey, screenLoaders } from './screenRegistry';
import { FEATURES } from '../config/featureRegistry';
import { CUSTOMERS } from './fixtures';
import { REVIEW_VERSION } from './models/workspaceModel';
import { restoreReviews } from './models/reviewModel';
import { PAGES, PAGE_BY_ID, demoHref, resolveDemoRoute, reviewKey, reviewTargets } from './catalog';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  window.scrollTo = vi.fn();
});
beforeEach(() => { localStorage.clear(); window.location.hash = '#/customers'; });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

async function renderDemo() {
  const result = render(<AdminDemo />);
  await screen.findByRole('table', { name: 'Customer directory' });
  return result;
}

describe('Page inventory and product boundaries', () => {
  it('includes every current feature and public page without duplicate destinations', () => {
    for (const feature of FEATURES) expect(PAGE_BY_ID[feature.id], feature.id).toBeTruthy();
    for (const id of ['customers', 'welcome', 'login', 'privacy', 'terms']) expect(PAGE_BY_ID[id]).toBeTruthy();
    expect(new Set(PAGES.map(p => p.id)).size).toBe(PAGES.length);
    expect(new Set(PAGES.map(p => p.path)).size).toBe(PAGES.length);
    expect(PAGE_BY_ID.finsync.path).toBe('/customers/finsync');
    expect(PAGE_BY_ID.oxfin.path).toBe('/customers/oxfin');
    expect(PAGE_BY_ID.finsync.views).toEqual(['customers', 'activity', 'support']);
  });
  it('round trips every page and view and rejects unknown view values', () => {
    for (const p of PAGES) for (const view of p.views.length ? p.views : ['']) {
      expect(resolveDemoRoute(demoHref(p.id, view))).toEqual({ page: p, view });
    }
    expect(resolveDemoRoute('#/customers?view=payments').view).toBe('customers');
    expect(resolveDemoRoute('#/unknown').page.id).toBe('overview');
  });
  it('separates approval for each page, view, theme and state', () => {
    const targets = reviewTargets();
    expect(new Set(targets.map(t => t.key)).size).toBe(targets.length);
    expect(reviewKey(PAGE_BY_ID.family, 'tree', 'light', 'populated')).not.toBe(reviewKey(PAGE_BY_ID.family, 'tree', 'dark', 'populated'));
    expect(reviewKey(PAGE_BY_ID.family, 'tree', 'light', 'populated')).not.toBe(reviewKey(PAGE_BY_ID.family, 'tree', 'light', 'error'));
  });
});

describe('Every route renders with its actual view contract', () => {
  for (const page of PAGES) for (const view of page.views.length ? page.views : ['']) for (const theme of ['light', 'dark']) for (const density of ['comfortable', 'compact']) {
    it(`${page.id}/${view || 'default'}/${theme}/${density}`, async () => {
      const { default: Screen } = await screenLoaders[resolveScreenKey(page)]();
      const html = renderToString(<ScopeProvider value={screenScope(page, view)}><Screen page={page} view={view} customers={CUSTOMERS} added={[]} nav={vi.fn()} openRecord={vi.fn()} openCustomer={vi.fn()} addRecord={vi.fn()} theme={theme} setTheme={vi.fn()} density={density} setDensity={vi.fn()} /></ScopeProvider>);
      expect(html.length).toBeGreaterThan(250);
      expect(html).not.toContain('undefined');
      expect(html).not.toContain('<iframe');
      expect(html).not.toContain('type="password"');
    });
  }
});

describe('Customer and review workflows', () => {
  it('filters and searches customer records without a network request', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await renderDemo();
    fireEvent.click(screen.getByRole('button', { name: 'Review', exact: true }));
    const table = screen.getByRole('table', { name: 'Customer directory' });
    expect(within(table).queryByText('Aarav Mehta')).toBeNull();
    expect(within(table).getByText('Maya Raman')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: /Search customers/ }), { target: { value: 'Kabir' } });
    expect(within(table).queryByText('Maya Raman')).toBeNull();
    expect(within(table).getByText('Kabir Rao')).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('adds a fictional customer and updates the local plan', async () => {
    await renderDemo();
    fireEvent.click(screen.getAllByRole('button', { name: 'Add sample customer' })[0]);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Customer name'), { target: { value: 'Sample Person' } });
    fireEvent.change(within(dialog).getByLabelText('Sample email'), { target: { value: 'person@example.test' } });
    fireEvent.change(within(dialog).getByLabelText('Product'), { target: { value: 'OxFin' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add to demo' }));
    expect(screen.getByText('Sample Person')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open Sample Person' }));
    fireEvent.change(screen.getByLabelText('Sample plan'), { target: { value: 'Premium' } });
    fireEvent.click(screen.getByRole('button', { name: 'Update sample plan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    const row = screen.getByText('Sample Person').closest('tr');
    expect(within(row).getByText('Premium')).toBeTruthy();
  });
  it('restricts each product directory to its own customers', async () => {
    window.location.hash = '#/customers/finsync'; await renderDemo();
    const table = screen.getByRole('table', { name: 'Customer directory' });
    expect(within(table).queryByText('Maya Raman')).toBeNull();
    expect(within(table).getByText('Aarav Mehta')).toBeTruthy();
  });
  it('persists only the reviewed theme and state and lets the user request changes', async () => {
    await renderDemo();
    fireEvent.click(screen.getByRole('button', { name: 'Approve this view' }));
    expect(screen.getByRole('button', { name: 'View approved' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    expect(screen.getByRole('button', { name: 'Approve this view' })).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Preview state'), { target: { value: 'error' } });
    expect(screen.getByText('All customers couldn’t be loaded')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Request changes' }));
    fireEvent.change(screen.getByLabelText('Your feedback'), { target: { value: 'Make the retry action more prominent.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save feedback locally' }));
    const review = restoreReviews(JSON.parse(localStorage.getItem(REVIEW_VERSION)));
    const viewport = `${window.innerWidth}x${window.innerHeight}`;
    expect(review[reviewKey(PAGE_BY_ID.customers, 'customers', 'light', 'populated', viewport)].status).toBe('approved');
    expect(review[reviewKey(PAGE_BY_ID.customers, 'customers', 'dark', 'error', viewport)].status).toBe('changes-requested');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('table', { name: 'Customer directory' })).toBeTruthy();
  });
  it('opens every page through the review catalog and supports keyboard search', async () => {
    await renderDemo();
    fireEvent.click(screen.getByRole('button', { name: /All pages & review/ }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Filter pages'), { target: { value: 'Family' } });
    expect(within(screen.getByRole('dialog')).getByText('Family Connect')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    fireEvent.change(screen.getByRole('textbox', { name: 'Search pages, customers, tasks and notes' }), { target: { value: 'OxFin' } });
    expect(within(screen.getByRole('dialog')).getByText('OxFin customers')).toBeTruthy();
  });
  it('reaches the empty and loading layouts without pretending they are real data', async () => {
    await renderDemo();
    fireEvent.change(screen.getByLabelText('Preview state'), { target: { value: 'empty' } });
    expect(screen.getByText('No customers yet')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Preview state'), { target: { value: 'loading' } });
    expect(screen.getByText('Loading your workspace')).toBeTruthy();
    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
  });
  it('does not reuse approval at a different viewport and keeps skip navigation on the same page', async () => {
    await renderDemo();
    fireEvent.click(screen.getByRole('button', { name: 'Approve this view' }));
    const width = window.innerWidth;
    act(() => { window.innerWidth = 390; window.dispatchEvent(new Event('resize')); });
    expect(screen.getByRole('button', { name: 'Approve this view' })).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'Skip to page content' }));
    expect(window.location.hash).toBe('#/customers');
    expect(document.activeElement.id).toBe('main-preview');
    act(() => { window.innerWidth = width; window.dispatchEvent(new Event('resize')); });
  });
});
