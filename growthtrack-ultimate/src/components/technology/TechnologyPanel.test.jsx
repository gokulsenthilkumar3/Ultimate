import React from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import TechnologyPanel from './TechnologyPanel';
import { technologyProfileKey } from '../../lib/technologyProfile';
afterEach(() => { cleanup(); localStorage.clear(); });
it('saves planning selections per account and identifies missing adapters', () => {
  const view = render(<TechnologyPanel ownerId="fixture-a" />);
  expect(screen.getByText(/do not change the running stack/)).toBeVisible();
  fireEvent.click(screen.getByRole('checkbox', { name: 'MongoDB' }));
  expect(JSON.parse(localStorage.getItem(technologyProfileKey('fixture-a')))).toEqual({ version: 1, selected: ['mongodb'] });
  expect(screen.getAllByText(/Adapter required/).length).toBeGreaterThan(0);
  view.unmount();
  render(<TechnologyPanel ownerId="fixture-b" />);
  expect(screen.getByRole('checkbox', { name: 'MongoDB' })).not.toBeChecked();
});
it('rejects imported credentials or commands', () => {
  render(<TechnologyPanel ownerId="fixture" />);
  fireEvent.change(screen.getByLabelText('Import a planning profile'), { target: { value: '{"version":1,"selected":[],"command":"shell"}' } });
  fireEvent.click(screen.getByRole('button', { name: 'Validate and import profile' }));
  expect(screen.getByRole('status')).toHaveTextContent('Invalid profile');
  expect(localStorage.getItem(technologyProfileKey('fixture'))).toBeNull();
});
