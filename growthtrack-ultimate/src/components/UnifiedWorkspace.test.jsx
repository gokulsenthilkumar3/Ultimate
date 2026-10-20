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
  it('opens FinSync inside Ultimate on the shared UI origin', async () => {
    render(<MemoryRouter><UnifiedWorkspace defaultApp="finsync" /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /FinSync/ })).toBeVisible();
    expect(screen.getByRole('link', { name: /Transactions/ })).toHaveAttribute('href', '/finance/transactions');
    expect(screen.getByTitle('FinSync app')).toHaveAttribute('src', '/Ultimate/products/finsync/');
    expect(fetch).toHaveBeenCalledWith('/api/gateway/health', { credentials: 'include' });
  });

  it('opens all five products without leaving Ultimate', () => {
    render(<MemoryRouter><UnifiedWorkspace defaultApp="matrix" /></MemoryRouter>);
    expect(screen.getAllByRole('button', { name: /^Open / })).toHaveLength(5);
    expect(document.querySelector('a[target="_blank"]')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Open Family Connect/ }));
    expect(screen.getByRole('link', { name: /Calendar/ })).toHaveAttribute('href', '/workspace/calendar');
    expect(screen.getByTitle('Family Connect app')).toHaveAttribute('src', '/Ultimate/products/family/');
  });
  it('shows an offline product without loading an unavailable frame', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ services: [{ id: 'forex', online: false }] }) });
    render(<MemoryRouter><UnifiedWorkspace defaultApp="forex" /></MemoryRouter>);
    expect(await screen.findByText('Forex is starting or unavailable')).toBeVisible();
    expect(document.querySelector('iframe')).toBeNull();
  });
});
