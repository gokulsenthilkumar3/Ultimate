import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import UnifiedWorkspace from './UnifiedWorkspace';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function Destination() { const location = useLocation(); return <output aria-label="Destination">{location.pathname}</output>; }
describe('native modules do not depend on legacy UI health', () => {
  for (const [product, route] of [['equity', '/finance/equity'], ['family', '/life/family'], ['forex', '/insights/forex']]) {
    it('opens ' + product + ' without probing or booting a companion frame', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Legacy UI is offline')));
      render(<MemoryRouter><UnifiedWorkspace defaultApp={product} /><Destination /></MemoryRouter>);
      expect(await screen.findByLabelText('Destination')).toHaveTextContent(route);
      expect(fetch).not.toHaveBeenCalled();
      expect(document.querySelector('iframe')).toBeNull();
    });
  }
});
