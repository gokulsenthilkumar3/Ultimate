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
  it('links to FinSync administration while keeping the customer product separate', async () => {
    render(<MemoryRouter><UnifiedWorkspace defaultApp="finsync" /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'FinSync', exact: true })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Manage FinSync customers' })).toHaveAttribute('href', '/finance/finsync');
    expect(screen.getByRole('link', { name: /Open separate FinSync product/ })).toHaveAttribute('href', '/Ultimate/products/finsync/');
    expect(document.querySelector('iframe')).toBeNull();
    expect(fetch).toHaveBeenCalledWith('/api/gateway/health', { credentials: 'include' });
  });

  it('keeps native migration fallbacks and both customer-admin entries reachable', () => {
    render(<MemoryRouter><UnifiedWorkspace defaultApp="matrix" /></MemoryRouter>);
    expect(screen.getAllByRole('button', { name: /^Open / })).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: /^Manage .* customers/ })).toHaveLength(2);
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
