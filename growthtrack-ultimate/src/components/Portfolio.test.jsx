import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Portfolio from './Portfolio';
import { holdingSnapshot, portfolioSnapshotKey, summarizePortfolio } from './PortfolioData';
import storage from '../utils/safeLocalStorage';

const mocks = vi.hoisted(() => ({ state: {}, toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('../store/useStore', () => ({ default: selector => selector(mocks.state) }));
vi.mock('../hooks/useToast', () => ({ useToast: () => mocks.toast }));
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>, PieChart: ({ children }) => <div>{children}</div>,
  Pie: () => <div data-testid="allocation-chart" />, Cell: () => null, Tooltip: () => null,
}));

const holding = { id: 'h1', name: 'ETF', symbol: 'ETF', type: 'ETF', units: 2, buyPrice: 100, currentPrice: 90, buyDate: '2026-08-01' };
const snapshot = { h1: { price: 90, date: '2026-09-15', name: 'ETF', symbol: 'ETF' } };
beforeEach(() => {
  vi.clearAllMocks();
  storage.clear();
  mocks.state = { user: { id: 'u1', currency: 'USD' }, portfolio: [holding], setPortfolio: vi.fn().mockResolvedValue({}) };
});
afterEach(cleanup);
const show = () => render(<MemoryRouter><Portfolio /></MemoryRouter>);
function addForm() {
  fireEvent.click(screen.getByRole('button', { name: 'Add Holding', exact: true }));
  fireEvent.change(screen.getByLabelText('asset name'), { target: { value: 'New ETF' } });
  fireEvent.change(screen.getByLabelText('units'), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText('buy price'), { target: { value: '100' } });
  fireEvent.change(screen.getByLabelText('manual snapshot price'), { target: { value: '90' } });
  fireEvent.change(screen.getByLabelText('snapshot date'), { target: { value: '2026-09-15' } });
}

describe('manual portfolio snapshots', () => {
  it('does not infer dated prices, gains, ROI, or a history from legacy holdings', () => {
    show();
    expect(screen.queryByRole('button', { name: /refresh/i })).toBeNull();
    expect(screen.getByText('Undated; verify manually')).toBeVisible();
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(1);
    expect(screen.queryByText(/ROI|Trend|Overall ROI/i)).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'Performance' }));
    expect(screen.getByText('Performance history unavailable')).toBeVisible();
    expect(screen.queryByText(/Last 30 Days|Simulated based/i)).toBeNull();
    expect(mocks.state.setPortfolio).not.toHaveBeenCalled();
  });
  it('requires a real date for a manually entered price', () => {
    show(); addForm();
    fireEvent.change(screen.getByLabelText('snapshot date'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    expect(mocks.toast.error).toHaveBeenCalledWith(expect.stringContaining('snapshot date'));
    expect(mocks.state.setPortfolio).not.toHaveBeenCalled();
  });
  it('awaits fallback setPortfolio before success, prevents duplicates, and retains the entered snapshot', async () => {
    let resolve;
    mocks.state.setPortfolio.mockReturnValue(new Promise(done => { resolve = done; }));
    show(); addForm();
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(mocks.toast.success).not.toHaveBeenCalled();
    fireEvent.submit(screen.getByLabelText('asset name').closest('form'));
    expect(mocks.state.setPortfolio).toHaveBeenCalledTimes(1);
    const saved = mocks.state.setPortfolio.mock.calls[0][0]([holding]).at(-1);
    expect(saved).toMatchObject({ name: 'New ETF', units: 2, buyPrice: 100, currentPrice: 90 });
    resolve({});
    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith('New ETF added to portfolio'));
    expect(screen.queryByLabelText('asset name')).toBeNull();
    expect(JSON.parse(storage.getItem(portfolioSnapshotKey(mocks.state.user)))[saved.id]).toMatchObject({ date: '2026-09-15', price: 90 });
  });
  it.each(['add', 'edit', 'delete'])('reports %s save rejection without a success or undo confirmation', async action => {
    mocks.state.setPortfolio.mockRejectedValue(new Error('Persistence failed'));
    show();
    if (action === 'add') { addForm(); fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true })); }
    if (action === 'edit') {
      fireEvent.click(screen.getByRole('button', { name: 'Edit ETF' }));
      fireEvent.change(screen.getByLabelText('Holding asset name'), { target: { value: 'Renamed ETF' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save holding' }));
    }
    if (action === 'delete') fireEvent.click(screen.getByRole('button', { name: 'Delete ETF' }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith(expect.stringContaining('Persistence failed')));
    expect(mocks.toast.success).not.toHaveBeenCalled();
    expect(mocks.toast.info).not.toHaveBeenCalled();
    if (action === 'add') expect(screen.getByLabelText('asset name')).toHaveValue('New ETF');
    if (action === 'edit') expect(screen.getByLabelText('Holding asset name')).toHaveValue('Renamed ETF');
  });
  it('preserves edit, delete, and fallback undo with signed dated differences', async () => {
    storage.setItem(portfolioSnapshotKey(mocks.state.user), JSON.stringify(snapshot));
    show();
    const row = within(screen.getByRole('row', { name: /ETF ETF ETF/ }));
    expect(row.getByText('As of 2026-09-15')).toBeVisible();
    expect(row.getByText(/-.*20/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Edit ETF' }));
    fireEvent.change(screen.getByLabelText('Holding manual snapshot price'), { target: { value: '85' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save holding' }));
    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith('Holding updated'));
    expect(mocks.state.setPortfolio.mock.calls[0][0]([holding])[0].currentPrice).toBe(85);
    fireEvent.click(screen.getByRole('button', { name: 'Delete ETF' }));
    await waitFor(() => expect(mocks.toast.info).toHaveBeenCalled());
    expect(mocks.state.setPortfolio.mock.calls[1][0]([holding])).toEqual([]);
    await mocks.toast.info.mock.calls[0][2].action.onClick();
    expect(mocks.state.setPortfolio.mock.calls[2][0]([])).toEqual([holding]);
  });
  it('awaits canonical holding actions too', async () => {
    mocks.state.addHolding = vi.fn().mockRejectedValue(new Error('Add failed'));
    mocks.state.updateHolding = vi.fn().mockRejectedValue(new Error('Edit failed'));
    mocks.state.deleteHolding = vi.fn().mockRejectedValue(new Error('Delete failed'));
    show(); addForm(); fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith(expect.stringContaining('Add failed')));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit ETF' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save holding' }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith(expect.stringContaining('Edit failed')));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel editing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete ETF' }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith(expect.stringContaining('Delete failed')));
    expect(mocks.state.setPortfolio).not.toHaveBeenCalled();
    expect(mocks.toast.success).not.toHaveBeenCalled();
  });
  it('reuses an optimistic add id on retry rather than duplicating the holding', async () => {
    mocks.state.addHolding = vi.fn(added => {
      mocks.state.portfolio = [...mocks.state.portfolio, added];
      return Promise.reject(new Error('Offline'));
    });
    mocks.state.updateHolding = vi.fn().mockResolvedValue({});
    show(); addForm(); fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalled());
    const id = mocks.state.portfolio.at(-1).id;
    fireEvent.click(screen.getByRole('button', { name: 'Add', exact: true }));
    await waitFor(() => expect(mocks.state.updateHolding).toHaveBeenCalledWith(id, expect.objectContaining({ name: 'New ETF' })));
    expect(mocks.state.addHolding).toHaveBeenCalledTimes(1);
  });
});

describe('snapshot valuation integrity', () => {
  it('uses recorded snapshots for losses and refuses incomplete portfolio totals', () => {
    expect(summarizePortfolio([holding], snapshot)).toMatchObject({ totalCost: 200, totalValue: 180, totalDifference: -20 });
    expect(summarizePortfolio([holding, { ...holding, id: 'h2' }], snapshot)).toMatchObject({ totalCost: 400, totalValue: null, totalDifference: null });
    expect(holdingSnapshot({ ...holding, currentPrice: 95 }, snapshot).date).toBeNull();
    expect(holdingSnapshot({ ...holding, name: 'Different asset' }, snapshot).date).toBeNull();
    expect(portfolioSnapshotKey({ id: 'u1' })).not.toBe(portfolioSnapshotKey({ id: 'u2' }));
  });
  it('does not use buy price as a current price or coerce malformed numbers', () => {
    expect(summarizePortfolio([{ ...holding, currentPrice: '' }], snapshot).totalValue).toBeNull();
    expect(summarizePortfolio([{ ...holding, units: true }], snapshot).totalCost).toBeNull();
  });
});
