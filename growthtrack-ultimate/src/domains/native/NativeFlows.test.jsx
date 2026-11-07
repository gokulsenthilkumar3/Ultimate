import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EquityPage from '../equity/EquityPage';
import FamilyPage from '../family/FamilyPage';
import ForexPage from '../forex/ForexPage';
import { buildForexSeries, forexCSV } from '../forex/forexModel';
import { familyRequest, resetFamilyConnection } from '../family/familyClient';
import { layoutFamilyTree } from '../family/treeLayout';
import { apiClient } from '../../lib/apiClient';

let owner = 'ultimate-owner';
// Real canvas layout/gestures are covered in Playwright; jsdom lacks the SVG APIs used by React Flow.
vi.mock('../family/FamilyTree', () => ({ default: () => null }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: owner } }) }));
vi.mock('../../hooks/usePlayfulMotion', () => ({ default: () => ({ canAnimate: false, reduced: true, paused: false, togglePaused: vi.fn() }) }));
vi.mock('../../lib/apiClient', () => ({ apiClient: { get: vi.fn() }, getCsrfToken: () => 'synthetic-csrf', refreshCsrfToken: async () => 'synthetic-csrf' }));
const clients = [];
function renderModule(Page, initial) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } }); clients.push(client);
  function Harness() { const [view, setView] = useState(initial); return <QueryClientProvider client={client}><Page view={view} onViewChange={setView} /></QueryClientProvider>; }
  return render(<Harness />);
}
const ok = data => ({ ok: true, status: 200, json: async () => data });
beforeEach(() => { owner = 'ultimate-owner'; resetFamilyConnection(owner); apiClient.get.mockReset(); });
afterEach(() => { cleanup(); clients.forEach(client => client.clear()); clients.length = 0; resetFamilyConnection(); vi.unstubAllGlobals(); });

describe('native NiftyLens flows', () => {
  it('pages a large snapshot, searches all quotes, and opens a real quote detail without an iframe', async () => {
    apiClient.get.mockResolvedValue({ provider: 'Test price cache', fetchedAt: '2026-10-30T10:00:00Z', limit: 200, quotes: Array.from({ length: 200 }, (_, id) => ({ symbol: `STORY${String(id).padStart(3, '0')}`, ltp: 110, open: 100, high: 115, low: 95, volume: 123, change: 10, changePercent: 10, updatedAt: null })) });
    renderModule(EquityPage, 'charts');
    expect(await screen.findByRole('button', { name: 'STORY000' })).toBeVisible();
    expect(document.querySelectorAll('tbody tr')).toHaveLength(25);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByRole('button', { name: 'STORY025' })).toBeVisible();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Find a symbol' }), 'STORY199');
    await userEvent.click(await screen.findByRole('button', { name: 'STORY199' }));
    expect(screen.getByRole('dialog', { name: /STORY199/ })).toBeVisible();
    expect(screen.getByText('Not provided')).toBeInTheDocument();
    expect(document.querySelector('iframe')).toBeNull();
  });
  it('shows a configured-source failure with recovery, without fabricated prices', async () => {
    apiClient.get.mockRejectedValue({ status: 503, payload: { code: 'MARKET_FEED_NOT_CONFIGURED', error: 'Connect the price cache.' } });
    renderModule(EquityPage, 'charts');
    expect(await screen.findByText('Connect the price cache.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
    expect(document.querySelector('tbody')).toBeNull();
  });
});

const person = { id: 'person-one', name: 'Asha Story', birthDate: '1980-01-02T00:00:00Z', bio: 'A fictional family historian.', occupation: 'Illustrator' };
function familyMock(role = 'editor') {
  return vi.fn(async (url, options = {}) => {
    if (url.endsWith('/session')) return ok({ authMode: 'ultimate', user: { id: 'family-user', name: 'Story User' } });
    if (url.endsWith('/me')) return ok({ memberId: null, member: null });
    if (url === '/api/native/family/trees') return ok([{ id: 'tree-one', name: 'Story family' }]);
    if (url.includes('/trees/tree-one?')) return ok({ id: 'tree-one', name: 'Story family', currentUserRole: role, members: [person], relationships: [], _count: { members: 1, relationships: 0, events: 0, documents: 0 } });
    if (url.startsWith('/api/native/family/members?')) return ok({ rows: [person], total: 1 });
    if (url === '/api/native/family/members/person-one') return ok(options.method === 'PUT' ? { ...person, ...JSON.parse(options.body) } : person);
    if (url.includes('/documents/')) return ok({ rows: [], total: 0 });
    if (url.includes('/events/')) return ok({ rows: [], total: 0 });
    throw new Error(`Unexpected test request ${url}`);
  });
}
async function connect() {
  await screen.findByText('Ultimate session · Story User');
  await screen.findByText(/editor access|viewer access/);
}

describe('native Family flows and account boundaries', () => {
  it('connects the existing account, edits a person through Family, and keeps the Ultimate account intact', async () => {
    const request = familyMock(); vi.stubGlobal('fetch', request); renderModule(FamilyPage, 'tree'); await connect();
    await userEvent.click(screen.getByRole('tab', { name: 'People' }));
    await userEvent.click(await screen.findByRole('button', { name: /Asha Story/ }));
    expect(await screen.findByText(person.bio)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Edit this person' }));
    const name = screen.getByRole('textbox', { name: 'Full name' }); await userEvent.clear(name); await userEvent.type(name, 'Asha New Story');
    await userEvent.click(screen.getByRole('button', { name: 'Save to Family Connect' }));
    await screen.findByText('Saved to Family Connect.');
    const write = request.mock.calls.find(([url, options]) => url.endsWith('/members/person-one') && options.method === 'PUT');
    expect(JSON.parse(write[1].body)).toMatchObject({ name: 'Asha New Story', bio: person.bio });
    expect(JSON.parse(write[1].body)).not.toHaveProperty('treeId');
    expect(write[1].headers.get('Authorization')).toBeNull();
    expect(write[1].headers.get('X-CSRF-Token')).toBe('synthetic-csrf');
    expect(write[1].credentials).toBe('include');
  });
  it('keeps viewer flows read-only within the shared Ultimate session', async () => {
    vi.stubGlobal('fetch', familyMock('viewer')); renderModule(FamilyPage, 'tree'); await connect();
    expect(screen.queryByRole('button', { name: 'Add person' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add relationship' })).toBeNull();
    await userEvent.click(screen.getByRole('tab', { name: 'Private vault' }));
    expect(await screen.findByText('Your vault is ready')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Upload file' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Disconnect Family account' })).toBeNull();
    expect(owner).toBe('ultimate-owner');
  });
  it('drops cached Family access on an Ultimate session change', async () => {
    vi.stubGlobal('fetch', familyMock()); renderModule(FamilyPage, 'tree'); await connect();
    window.dispatchEvent(new CustomEvent('growthtrack:session-changed', { detail: { owner: 'another-owner' } }));
    await waitFor(() => expect(screen.queryByText('Ultimate session · Story User')).toBeNull());
    expect(screen.queryByLabelText('Password')).toBeNull();
  });
  it('does not treat a legacy Family token failure as an Ultimate session failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ok:false,status:401,json:async()=>({error:'Expired legacy session'})})));
    const expire=vi.fn();window.addEventListener('growthtrack:auth-expired',expire);
    await expect(familyRequest('/trees', {connection:{token:'expired'}})).rejects.toMatchObject({status:401});
    expect(expire).not.toHaveBeenCalled();window.removeEventListener('growthtrack:auth-expired',expire);
  });
  it('hides cached private documents when a refresh reports that tree access was removed', async () => {
    const original = familyMock('viewer'); let revoked = false;
    vi.stubGlobal('fetch', vi.fn(async (url, options) => {
      if (url.includes('/documents/')) return revoked ? { ok: false, status: 403, json: async () => ({ error: 'Tree access was removed.' }) } : ok({ rows: [{ id: 'fictional-file', fileName: 'Fictional certificate.pdf', type: 'other', uploadedAt: '2026-01-01' }], total: 1 });
      if (revoked && url.includes('/trees/tree-one?')) return { ok: false, status: 404, json: async () => ({ error: 'Tree access was removed.' }) };
      return original(url, options);
    }));
    renderModule(FamilyPage, 'tree'); await connect();
    await userEvent.click(screen.getByRole('tab', { name: 'Private vault' }));
    expect(await screen.findByText('Fictional certificate.pdf')).toBeVisible();
    revoked = true; await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(screen.queryByText('Fictional certificate.pdf')).toBeNull());
    expect(screen.getAllByText('Tree access was removed.').length).toBeGreaterThan(0);
  });
  it('bounds graph nodes and terminates when the imported relationships contain a cycle', () => {
    const people = Array.from({ length: 1000 }, (_, id) => ({ id: String(id), name: `Person ${id}` }));
    const graph = layoutFamilyTree(people, [{ id: 'a', member1Id: '0', member2Id: '1', type: 'parent' }, { id: 'b', member1Id: '1', member2Id: '0', type: 'parent' }]);
    expect(graph.visible).toHaveLength(60); expect(graph.height).toBeLessThan(3000);
  });
});

describe('native Forex research flows', () => {
  it('opens a loaded model, changes currency, and pages plotted rows without loading the Python UI', async () => {
    apiClient.get.mockImplementation(async path => path.includes('/metadata') ? { models: ['lgb'], currencies: ['USD', 'EUR'], rows: 1000, dateFrom: '2025-01-01', dateTo: '2026-10-01', disclaimer: 'Historical model outputs.' } : { model: 'lgb', sampled: false, series: [{ currency: path.includes('EUR') ? 'EUR' : 'USD', points: Array.from({ length: 60 }, (_, id) => ({ date: `2026-08-${String(id % 28 + 1).padStart(2, '0')}`, sourceDate: `2026-07-${String(Math.floor(id / 28) + 1).padStart(2, '0')}`, observed: 10 + id, modelRate: 11 + id, estimatedDate: false })) }] });
    renderModule(ForexPage, 'models');
    await userEvent.click(await screen.findByRole('button', { name: /LightGBM/ }));
    expect(await screen.findByRole('table', { name: /Forex historical/ })).toBeInTheDocument();
    expect(document.querySelectorAll('tbody tr')).toHaveLength(25);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Currency' }), 'EUR');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'EUR · observed & model' })).toBeVisible());
    expect(apiClient.get.mock.calls.some(([path]) => path.includes('currencies=EUR'))).toBe(true);
    expect(document.querySelector('iframe')).toBeNull();
  });
  it('normalizes comparisons from observations and preserves missing future values in export', () => {
    const data = [{ currency: 'USD', points: [{ date: '2026-01-01', sourceDate: '2026-01-01', observed: 10, modelRate: 11 }, { date: '2026-01-02', sourceDate: '2026-01-02', observed: null, modelRate: 12 }] }];
    const lines = buildForexSeries(data, 'compare', 'lgb');
    expect(lines[0].points.map(point => point.value)).toEqual([0, null]);
    expect(lines[1].points[0].value).toBeCloseTo(10);
    expect(forexCSV(data)).toContain('"2026-01-02","2026-01-02","","12"');
  });
});
