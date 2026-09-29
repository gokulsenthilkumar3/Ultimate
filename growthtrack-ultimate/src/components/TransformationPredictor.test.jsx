import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ state: {} }));
vi.mock('../store/useStore', () => ({ default: selector => selector ? selector(mocks.state) : mocks.state }));
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  LineChart: ({ data }) => <div data-testid="dated-projection">{JSON.stringify(data)}</div>,
  Line: () => null, XAxis: () => null, YAxis: () => null, CartesianGrid: () => null,
  Tooltip: () => null, ReferenceLine: () => null, Legend: () => null,
}));
import TransformationPredictor from './TransformationPredictor';
const logs = [{ date: '2026-09-01', weight: 80 }, { date: '2026-09-08', weight: 79 }, { date: '2026-09-15', weight: 78 }];
beforeEach(() => { mocks.state = { user: {}, metric_logs: logs, bodyProfile: { targetWeightKg: 75 } }; });
afterEach(cleanup);
const show = props => render(<MemoryRouter><TransformationPredictor {...props} /></MemoryRouter>);
it('requires three valid distinct-date observations per metric', () => {
  show({ logs: [logs[0], logs[0], logs[1], { date: 'invalid', weight: 76 }] });
  expect(screen.getByText('Need at least 3 valid observations on distinct dates')).toBeVisible();
  expect(screen.queryByText(/Observed weekly change/)).toBeNull();
  expect(screen.queryByText(/confidence|AI-driven|meta score|elite/i)).toBeNull();
});
it('shows dated units, signed observed change, actual saved target and conditional estimates', () => {
  show({});
  const card = within(screen.getByRole('article', { name: 'Weight forecast' }));
  expect(card.getByText(/User target: 75 kg/)).toBeVisible();
  expect(card.getByText(/Observed weekly change: -1 kg\/week/)).toBeVisible();
  expect(card.getByText(/30 days after 2026-09-15/)).toBeVisible();
  expect(card.getByText(/Estimated target date:/)).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Timeline' }));
  expect(screen.getByTestId('dated-projection')).toHaveTextContent('2026-09-22');
  expect(screen.getByTestId('dated-projection')).toHaveTextContent('"projected":77');
  expect(screen.getByRole('link', { name: 'Open measurement history' })).toHaveAttribute('href', '/wellness/physique?view=history');
});
it('shows missing targets without inventing defaults', () => {
  mocks.state.bodyProfile = null;
  show({});
  expect(screen.getByText('User target: Not set')).toBeVisible();
  expect(screen.queryByText(/30 days after|Estimated target date/)).toBeNull();
});
it.each([['flat', [80, 80, 80], 'No observed change; no ETA'], ['worsening', [78, 79, 80], 'Observed trend moves away from target; no ETA']])('does not invent %s improvement', (_label, values, status) => {
  show({ logs: logs.map((log, index) => ({ ...log, weight: values[index] })) });
  expect(screen.getByText(status)).toBeVisible();
  expect(screen.getByText('Estimated target date: Unavailable')).toBeVisible();
});
