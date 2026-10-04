import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UnifiedWorkspace from './UnifiedWorkspace';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ services: [] }) }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('companion integration view', () => {
  it('shows Ultimate-owned destinations without embedding a standalone app', async () => {
    render(<MemoryRouter><UnifiedWorkspace defaultApp="finsync" /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'FinSync' })).toBeVisible();
    expect(screen.getByRole('link', { name: /Transactions/ })).toHaveAttribute('href', '/finance/transactions');
    expect(screen.getByText(/previewable import and ledger reconciliation/)).toBeVisible();
    expect(document.querySelector('iframe')).toBeNull();
    expect(fetch).toHaveBeenCalledWith('/api/gateway/health', { credentials: 'include' });
  });

  it('keeps the five original apps visible during migration', () => {
    render(<MemoryRouter><UnifiedWorkspace defaultApp="matrix" /></MemoryRouter>);
    expect(screen.getAllByRole('link', { name: /Open original app during migration/ })).toHaveLength(5);
    expect(screen.getAllByText('Ultimate integration in progress')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: /Family Connect/ }));
    expect(screen.getByRole('link', { name: /Calendar/ })).toHaveAttribute('href', '/workspace/calendar');
    expect(document.querySelector('iframe')).toBeNull();
  });
});
