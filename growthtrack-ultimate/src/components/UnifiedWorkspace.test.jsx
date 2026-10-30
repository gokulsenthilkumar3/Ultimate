import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import UnifiedWorkspace from './UnifiedWorkspace';

function Destination() { const location = useLocation(); return <output aria-label="Destination">{location.pathname}</output>; }
beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ services: [] }) })));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('native suite navigation', () => {
  it('keeps FinSync customer administration and its separate product reachable', () => {
    render(<MemoryRouter><UnifiedWorkspace defaultApp="finsync" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Manage FinSync customers' })).toHaveAttribute('href', '/finance/finsync');
    expect(screen.getByRole('link', { name: /Open separate FinSync product/ })).toHaveAttribute('href', '/Ultimate/products/finsync/');
    expect(document.querySelector('iframe')).toBeNull();
  });
  it('opens Family Connect inside Ultimate from the suite', async () => {
    render(<MemoryRouter><UnifiedWorkspace /><Destination /></MemoryRouter>);
    expect(screen.getAllByText('Native in Ultimate')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: /Open Family Connect/ }));
    expect(await screen.findByLabelText('Destination')).toHaveTextContent('/life/family');
    expect(document.querySelector('iframe')).toBeNull();
  });
});
