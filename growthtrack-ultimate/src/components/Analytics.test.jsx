import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
const mocks = vi.hoisted(() => ({ state: {} }));
vi.mock('../store/useStore', () => ({ default: selector => selector ? selector(mocks.state) : mocks.state }));
vi.mock('./Logs', () => ({ default: () => { throw new Error('Analytics must link to canonical logs'); } }));
vi.mock('./TransformationPredictor', () => ({ default: () => { throw new Error('Analytics must link to canonical forecast'); } }));
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  ScatterChart: ({ children }) => <div>{children}</div>, Scatter: ({ data }) => <div data-testid="correlation-data">{JSON.stringify(data)}</div>,
  AreaChart: ({ children, data }) => <div data-testid="trend-data">{JSON.stringify(data)}{children}</div>,
  XAxis: () => null, YAxis: () => null, Tooltip: () => null, CartesianGrid: () => null, Legend: () => null,
  Area: () => null,
}));
import Analytics from './Analytics';
import { localDateKey } from '../lib/metricSeries';
beforeEach(() => {
  mocks.state = { user: {}, tasks: [], habits: [], goals: [], habitLogsByHabit: {}, metric_logs: [], sleep_logs: [] };
});
afterEach(cleanup);
function show() { return render(<MemoryRouter><Analytics /></MemoryRouter>); }
it('links to canonical forecast and audit logs without embedding duplicate modules', () => {
  show();
  expect(screen.getByRole('link', { name: 'Growth Forecast' })).toHaveAttribute('href', '/insights/forecast');
  expect(screen.getByRole('link', { name: 'Audit Logs' })).toHaveAttribute('href', '/hub/logs');
  expect(screen.queryByRole('tablist', { name: 'Analytics sections' })).toBeNull();
  expect(screen.getByRole('tablist', { name: 'Correlation views' })).toBeVisible();
});
it('does not invent correlations from missing values, invalid dates, or constant series', () => {
  for (let day = 1; day <= 6; day++) {
    const date = '2026-09-0' + day;
    mocks.state.sleep_logs.push({ date, duration: 8 });
    mocks.state.metric_logs.push({ date, type: 'mood', value: day });
  }
  mocks.state.metric_logs.push({ date: '2026-09-31', type: 'energy', value: 8 }, { date: '2026-09-01', type: 'energy', value: '' });
  show();
  expect(screen.getByText('Sleep × Mood r=N/A')).toBeVisible();
  expect(screen.getByText('Sleep × Energy r=N/A')).toBeVisible();
  expect(screen.getByText('Energy × Mood r=N/A')).toBeVisible();
});
it('retains genuine zeroes while discarding blank values in trends', () => {
  mocks.state.metric_logs = [
    { date: '2026-09-01', type: 'energy', value: 0 },
    { date: '2026-09-02', type: 'energy', value: 1 },
    { date: '2026-09-03', type: 'energy', value: 2 },
    { date: '2026-09-04', type: 'energy', value: '' },
  ];
  show(); fireEvent.click(screen.getByRole('tab', { name: 'trends' }));
  const trend = screen.getByTestId('trend-data');
  expect(trend).toHaveTextContent('"energy":0');
  expect(trend).not.toHaveTextContent('09-04');
});

it('keeps missing goal progress unavailable while retaining recorded zeroes and completion', () => {
  mocks.state.goals = [
    { id: 'missing', title: 'Missing current', target_value: 10, current_value: null },
    { id: 'negative', title: 'Invalid target', target_value: -10, current_value: 2 },
    { id: 'zero', title: 'Recorded zero', target_value: 10, current_value: 0 },
    { id: 'done', title: 'Completed', status: 'completed' },
  ];
  show(); fireEvent.click(screen.getByRole('tab', { name: 'goals' }));
  expect(screen.getAllByText('Progress unavailable')).toHaveLength(2);
  expect(screen.getByText('0%')).toBeVisible();
  expect(screen.getByText('100%')).toBeVisible();
});

it('counts completed tasks in their due-date cohort once across different completion dates', () => {
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  mocks.state.tasks = [
    { due_date: localDateKey(twoDaysAgo), completed_at: localDateKey(today), completed: true },
    { due_date: localDateKey(yesterday), completed: false },
    { due_date: localDateKey(today), completed: false },
  ];
  show(); fireEvent.click(screen.getByRole('tab', { name: 'trends' }));
  const data = JSON.parse(screen.getByTestId('trend-data').textContent);
  expect(data.find(point => point.date === localDateKey(today).slice(5))).toMatchObject({ rate: 0, total: 1 });
  expect(data.find(point => point.date === localDateKey(twoDaysAgo).slice(5))).toMatchObject({ rate: 100, total: 1 });
});
