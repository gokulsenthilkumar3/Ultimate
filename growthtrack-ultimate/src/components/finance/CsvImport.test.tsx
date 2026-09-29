import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CsvImport from './CsvImport';
import type { FinancePreview } from '../../utils/financeImport';

const mocks = vi.hoisted(() => ({ preview: vi.fn(), commit: vi.fn(), refresh: vi.fn(), success: vi.fn() }));
vi.mock('../../utils/financeImport', async importOriginal => ({ ...(await importOriginal<typeof import('../../utils/financeImport')>()), previewFinanceCsv: mocks.preview, commitFinanceCsv: mocks.commit }));
vi.mock('../../utils/financeApi', () => ({ refreshFinanceTransactions: mocks.refresh }));
vi.mock('../../hooks/useToast', () => ({ useToast: () => ({ success: mocks.success }) }));
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); mocks.refresh.mockResolvedValue(undefined); });
const csv = 'Amount,Type,Date,Description\n10,Expense,2026-09-28,Lunch\n20,Expense,2026-09-27,Dinner';
function preview(overrides: Partial<FinancePreview> = {}): FinancePreview {
  return { previewId: 'preview-id', expiresAt: '2026-09-29T15:30:00Z', canCommit: true, summary: { total: 2, valid: 2, invalid: 0, duplicates: 1, importable: 1 }, rows: [
    { row: 2, status: 'valid', transaction: { amount: 10, type: 'Expense', date: '2026-09-28', category: null, method: null, note: 'Lunch' }, errors: [] },
    { row: 3, status: 'duplicate', transaction: { amount: 20, type: 'Expense', date: '2026-09-27', category: null, method: null, note: 'Dinner' }, errors: [] },
  ], ...overrides };
}
async function upload(content = csv) {
  const file = new File([content], 'statement.csv', { type: 'text/csv' });
  Object.defineProperty(file, 'text', { value: async () => content });
  fireEvent.change(screen.getByLabelText('CSV statement'), { target: { files: [file] } });
  await screen.findByText('statement.csv · 2 source rows');
}
describe('Finance CSV preview and confirmation', () => {
  it('maps and previews rows without committing, then waits for acknowledged confirmation', async () => {
    mocks.preview.mockResolvedValue(preview());
    let acknowledge: (response: object) => void = () => {};
    mocks.commit.mockImplementation(() => new Promise(resolve => { acknowledge = resolve; }));
    render(<CsvImport formatMoney={amount => '₹' + amount} />);
    await upload();
    fireEvent.click(screen.getByRole('button', { name: 'Preview mapped rows' }));
    expect(await screen.findByText('Duplicate · skip')).toBeVisible();
    expect(mocks.preview).toHaveBeenCalledWith(expect.stringContaining('amount,type,category,method,date,note'));
    expect(mocks.commit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Confirm import' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm import' }));
    expect(mocks.commit).toHaveBeenCalledWith('preview-id');
    expect(mocks.success).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Confirm import' })).toBeDisabled();
    await act(async () => acknowledge({ imported: 1, duplicates: 1, total: 2, replayed: false }));
    expect(await screen.findByText('Import acknowledged: 1 imported, 1 duplicates skipped.')).toBeVisible();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
    expect(mocks.success).toHaveBeenCalledTimes(1);
  });
  it('shows row errors and blocks commit for invalid previews', async () => {
    const data = preview();
    data.rows[0].status = 'invalid';
    data.rows[0].errors = [{ field: 'date', message: 'Use a valid date in YYYY-MM-DD format.' }];
    mocks.preview.mockResolvedValue({ ...data, previewId: null, expiresAt: null, canCommit: false, summary: { total: 2, valid: 1, invalid: 1, duplicates: 1, importable: 0 } });
    render(<CsvImport formatMoney={String} />);
    await upload();
    fireEvent.click(screen.getByRole('button', { name: 'Preview mapped rows' }));
    expect(await screen.findByText('date: Use a valid date in YYYY-MM-DD format.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Confirm import' })).not.toBeInTheDocument();
    expect(mocks.commit).not.toHaveBeenCalled();
  });
  it('retains preview and shows no success on a failed commit', async () => {
    mocks.preview.mockResolvedValue(preview());
    mocks.commit.mockRejectedValue(new Error('Preview expired'));
    render(<CsvImport formatMoney={String} />);
    await upload();
    fireEvent.click(screen.getByRole('button', { name: 'Preview mapped rows' }));
    await screen.findByText('Duplicate · skip');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm import' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Preview expired');
    expect(screen.getByText('Duplicate · skip')).toBeVisible();
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it('reports an acknowledged import separately from a failed ledger refresh', async () => {
    mocks.preview.mockResolvedValue(preview());
    mocks.commit.mockResolvedValue({ imported: 1, duplicates: 1, total: 2, replayed: true });
    mocks.refresh.mockRejectedValueOnce(new Error('Load failed')).mockResolvedValueOnce(undefined);
    render(<CsvImport formatMoney={String} />);
    await upload();
    fireEvent.click(screen.getByRole('button', { name: 'Preview mapped rows' }));
    await screen.findByText('Duplicate · skip');
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm import' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Import was acknowledged');
    expect(screen.getByText(/previous commit reconciled/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh ledger' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(mocks.commit).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).toHaveBeenCalledTimes(2);
  });
  it('invalidates preview when mapping changes, requiring a new review', async () => {
    mocks.preview.mockResolvedValue(preview());
    render(<CsvImport formatMoney={String} />);
    await upload();
    fireEvent.click(screen.getByRole('button', { name: 'Preview mapped rows' }));
    await screen.findByText('Duplicate · skip');
    fireEvent.change(screen.getByLabelText('note'), { target: { value: '' } });
    expect(screen.queryByText('Duplicate · skip')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm import' })).not.toBeInTheDocument();
  });
});
