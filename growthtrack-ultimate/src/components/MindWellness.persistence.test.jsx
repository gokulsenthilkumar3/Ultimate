import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { webcrypto } from 'node:crypto';
import MindWellness from './MindWellness';
import useStore from '../store/useStore';
import { apiRequest } from '../lib/apiClient';
import { LEGACY_JOURNAL_KEY } from '../store/journalActions';

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }));
vi.mock('../hooks/useToast', () => ({ useToast: () => toast }));
vi.mock('../lib/apiClient', () => ({ apiRequest: vi.fn() }));
vi.mock('../lib/logger', () => ({ logCRUD: vi.fn().mockResolvedValue(undefined) }));
const legacy = { id: 123, date: '2020-01-02', time: '2020-01-02T12:00:00Z', text: 'Legacy private reflection', prompt: 'Why?' };
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal('crypto', webcrypto);
  useStore.getState().resetSessionData(); useStore.setState({ user: { id: 'owner', tasks: { pending: [], completed: [] } } });
  localStorage.setItem(LEGACY_JOURNAL_KEY, JSON.stringify([legacy]));
  apiRequest.mockRejectedValue(new Error('Save failed; try again.'));
});
afterEach(cleanup);
function RouteProbe() {
  const location = useLocation(), navigate = useNavigate();
  return <><output data-testid="url">{location.search}</output><button onClick={() => navigate(-1)}>Back</button></>;
}
const mount = (query = '?view=journal&keep=yes') => render(<MemoryRouter initialEntries={[`/wellness/mind${query}`]}><RouteProbe /><MindWellness /></MemoryRouter>);

describe('MindWellness persistence and explicit import', () => {
  it('uses query views and browser history while preserving other parameters', async () => {
    mount(); expect(screen.getByPlaceholderText('Start writing here...')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Breathe', exact: true }));
    expect(screen.getByTestId('url')).toHaveTextContent('view=breathe');
    expect(screen.getByTestId('url')).toHaveTextContent('keep=yes');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByPlaceholderText('Start writing here...')).toBeVisible();
  });
  it('does not expose or migrate local journals until preview and confirmed import', async () => {
    mount(); expect(screen.queryByText(/Legacy private reflection/)).toBeNull(); expect(apiRequest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Preview legacy journals on this device' }));
    expect(screen.getByText(/Legacy private reflection/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Import selected journals' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /Legacy private reflection/ }));
    expect(screen.getByRole('button', { name: 'Import selected journals' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm/ }));
    apiRequest.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('Import failed')).mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: 'Import selected journals' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Import failed');
    expect(JSON.parse(localStorage.getItem(LEGACY_JOURNAL_KEY))).toEqual([legacy]);
    expect(useStore.getState().notes).toEqual([]); expect(toast.success).not.toHaveBeenCalled();
  });
  it('keeps an unsaved journal draft and ignores another owner’s server notes', async () => {
    useStore.setState({ notes: [{ id: 'other', userId: 'other-owner', source: 'mind-journal', content: 'Other account secret', date: '2020-01-02' }] });
    mount(); expect(screen.queryByText('Other account secret')).toBeNull();
    fireEvent.change(screen.getByPlaceholderText('Start writing here...'), { target: { value: 'Keep my unsaved reflection' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Entry' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
    expect(screen.getByPlaceholderText('Start writing here...')).toHaveValue('Keep my unsaved reflection');
    expect(toast.success).not.toHaveBeenCalled();
    const payload = JSON.parse(apiRequest.mock.calls[0][1].body);
    expect(payload).toMatchObject({ source: 'mind-journal', content: 'Keep my unsaved reflection', wordCount: 4 });
  });
  it('reports failed mood writes without showing a saved badge', async () => {
    mount('?view=checkin');
    fireEvent.click(screen.getByRole('button', { name: /Excellent/ }));
    fireEvent.click(screen.getByRole('button', { name: /Log.*Excellent/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
    expect(screen.queryByText('✓ Logged')).toBeNull();
    expect(useStore.getState().moodLogs).toEqual([]); expect(toast.success).not.toHaveBeenCalled();
  });
});
